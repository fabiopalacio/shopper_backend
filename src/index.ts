import { clientMeasures, PrismaClient } from "@prisma/client";
import fastify, { FastifyReply, FastifyRequest } from "fastify";
import gemini from "./gemini.js";
import { PostBody,Measures,PatchBody,GetQuery, CustomerInfo } from "./interfaces.js";

const prisma = new PrismaClient();

const ADDRESS = '0.0.0.0'
const  PORT = '3333' 

const server = fastify();
server.listen({ host: ADDRESS, port: parseInt(PORT) });

//ENDPOINTS
server.post("/upload", async (request: FastifyRequest, reply: FastifyReply) => {

    let { image, customer_code, measure_datetime, measure_type } =
        request.body as PostBody;

    const temp_image = image.split('base64,').pop()
    if(temp_image){
        image = temp_image
    }

    if (
        !image || 
        !customer_code || 
        !measure_datetime || 
        !measure_type || 
        (measure_type.toUpperCase() != "GAS" && measure_type.toUpperCase() != "WATER")) {
            return reply.status(400).send({
                error_code: "INVALID_DATA",
                error_description:
                    "Os dados fornecidos no corpo da requisição são inválidos",
            });
        }
    


    const month: number = new Date(measure_datetime).getMonth();

    measure_type = measure_type.toUpperCase()
    
    const searchMeasure: clientMeasures | null = await prisma.clientMeasures.findFirst({
        where: {
            month: month,
            customer_code: customer_code,
            measure_type: measure_type,
        },
    });


    if (searchMeasure) {
        return reply.status(409).send({
            error_code: "DOUBLE_REPORT",
            error_description: "Leitura do mês já realizada",
        });
    }

    const {image_url, measure_value}: {image_url:string; measure_value:string;} = await gemini(image, customer_code, measure_type, month.toString())


    const newClientMeasure = await prisma.clientMeasures.create({
        data: {
            customer_code: customer_code,
            measure_datetime: measure_datetime,
            measure_type: measure_type,
            month: month,
            image_url: image_url,
            measure_value: parseInt(measure_value)
        },
    });

    return reply.status(200).send({
        image_url: newClientMeasure.image_url,
        measure_value: newClientMeasure.measure_value,
        measure_uuid: newClientMeasure.measure_uuid,
    });
});

server.get<{ Querystring: GetQuery }>(
    "/:customer_code/list",
    async (request: FastifyRequest, reply: FastifyReply) => {

        const params: any = request.params;
        const customer_code: string = params.customer_code;

        const query: any = request.query;
        let measure_type: string = query.measure_type;
        
        if(measure_type){
            measure_type = measure_type.toUpperCase()
        }

        if (
            measure_type &&
            measure_type != "WATER" &&
            measure_type != "GAS"
        ) {
            return reply.status(400).send({
                error_code: "INVALID_TYPE",
                error_description: "Tipo de medição não permitida",
            });
        }


        if (customer_code) {
            const result: any = await prisma.clientMeasures.findMany({
                where: {
                    ...(measure_type
                        ? 
                        {
                            measure_type: measure_type,
                            customer_code: customer_code,
                        }
                        : { customer_code: customer_code }),
                },
                select: {
                    measure_uuid: true,
                    measure_datetime: true,
                    measure_type: true,
                    has_confirmed: true,
                    image_url: true,
                },
            });

            if (!result || result.length == 0) {
                return reply.status(404).send({
                    error_code: "MEASURES_NOT_FOUND",
                    error_description: "Nenhuma leitura encontrada",
                });
            }
            
            const measures_to_return: Measures[] = [];
            for (let index = 0; index < result.length; index++) {
                const element = result[index];
                measures_to_return.push(element);
            }

            const info_to_return: CustomerInfo = {
                customer_code: customer_code,
                measures: measures_to_return
            };
            return reply.status(200).send(info_to_return);
        }
    }
);

server.patch("/confirm", async (request: FastifyRequest, reply:FastifyReply)=> {
    const {measure_uuid, confirmed_value} = request.body as PatchBody
    if (!measure_uuid || !confirmed_value){

        //Neste return inseri o texto que estava na descrição pois o que estava inserido na coluna de resposta
        //não era o adequado para essa situação
        return reply.status(400).send(
            { 
                "error_code": "INVALID_DATA",
                "error_description": "Os dados fornecidos no corpo da requisição são inválidos"
            })
    }
    const measure = await prisma.clientMeasures.findUnique({where: {measure_uuid:measure_uuid}})

    
    if(!measure){
        return reply.status(404).send(
            { 
                "error_code": "MEASURE_NOT_FOUND",
                "error_description": "Leitura não encontrada"
            }
        )
    }

    if (measure.has_confirmed){
        return reply.status(409).send(
            { 
                "error_code": "CONFIRMATION_DUPLICATE",
                "error_description": "Leitura do mês já realizada"
            }
        )
    }
    await prisma.clientMeasures.update({where:{measure_uuid: measure_uuid}, data:{
        measure_value: confirmed_value,
        has_confirmed: true
    }})
    
    return reply.status(200).send({"sucess": true})
})

