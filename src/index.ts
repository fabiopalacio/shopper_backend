import { client, PrismaClient } from "@prisma/client";
import fastify, { FastifyReply, FastifyRequest } from "fastify";

const prisma = new PrismaClient();

const server = fastify();
server.listen({ port: 3333 });

server.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    interface PostBody {
        image: string;
        customer_code: string;
        measure_datetime: string;
        measure_type: string;
    }

    const { image, customer_code, measure_datetime, measure_type } =
        request.body as PostBody;

    if (!image || !customer_code || !measure_datetime || !measure_type) {
        return reply.status(400).send({
            error_code: "INVALID_DATA",
            error_description:
                "Os dados fornecidos no corpo da requisição são inválidos",
        });
    }
    const month: number = new Date(measure_datetime).getMonth();

    const searchMeasure: client | null = await prisma.client.findFirst({
        where: {
            month: month,
            customer_code: customer_code,
            measure_type: measure_type,
        },
    });

    if (searchMeasure) {
        reply.status(409).send({
            error_code: "DOUBLE_REPORT",
            error_description: "Leitura do mês já realizada",
        });
    }

    //FAZER: Envio para IA
    const newClient = await prisma.client.create({
        data: {
            customer_code: customer_code,
            image_url: image,
            measure_datetime: measure_datetime,
            measure_type: measure_type,
            month: month,
        },
    });
    return reply.status(200).send({
        image_url: "string",
        measure_value: "integer",
        measure_uuid: "string",
    });
});

interface Measures {
    measure_uuid: string;
    measure_datetime: string;
    measure_type: string;
    has_confirmed: boolean;
    image_url: string;
}

interface QueryParams {
    measure_type?: string;
}

class CustomerInfo {
    customer_code: string = "";
    measures: Measures[];

    constructor(customer_code: string, measures: Measures[]) {
        this.customer_code = customer_code;
        this.measures = measures;
    }
}

server.get<{ Querystring: QueryParams }>(
    "/:customer_code/list",
    async (request: FastifyRequest, reply: FastifyReply) => {
        const params: any = request.params;
        const customer_code: string = params.customer_code;

        const query: any = request.query;
        const measure_type: string = query.measure_type;

        if (
            measure_type &&
            measure_type.toUpperCase() != "WATER" &&
            measure_type.toUpperCase() != "GAS"
        ) {
            return reply.status(400).send({
                error_code: "INVALID_TYPE",
                error_description: "Tipo de medição não permitida",
            });
        }

        if (customer_code) {
            const result: any = await prisma.client.findMany({
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

            if (!result) {
                return reply.status(404).send({
                    error_code: "MEASURES_NOT_FOUND",
                    error_description: "Nenhuma leitura encontrada",
                });
            }
            if (result.length == 0) {
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

            const info_to_return = new CustomerInfo(
                customer_code,
                measures_to_return
            );
            return reply.status(200).send(info_to_return);
        }
    }
);

    interface PatchBody {
        measure_uuid: string;
        confirmed_value: number;
    }

server.patch("/", async (request: FastifyRequest, reply:FastifyReply)=> {
    const {measure_uuid, confirmed_value} = request.body as PatchBody
    if (!measure_uuid || !confirmed_value){
        return reply.status(400).send(
            { 
                "error_code": "INVALID_DATA",
                "error_description": "UUID da medida ou valor de confirmação ausente."
            })
    }
    const measure = await prisma.client.findUnique({where: {measure_uuid:measure_uuid}})

    
    if(!measure){
        return reply.status(404).send(
            { 
                "error_code": "MEASURE_NOT_FOUND",
                "error_description": "Leitura do mês já realizada"
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

    await prisma.client.update({where:{measure_uuid: measure_uuid}, data:{
        measure_value: confirmed_value,
        has_confirmed: true
    }})

    return reply.status(200).send({"sucess": true})
})