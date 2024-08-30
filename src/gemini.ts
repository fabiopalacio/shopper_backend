

import {GoogleGenerativeAI } from "@google/generative-ai"
import { GoogleAIFileManager } from "@google/generative-ai/server";
import path from "path";
import fs from "fs"


export default async function gemini(image: string, customer_code: string, measure_type:string, measure_month:string ) {
    const API: string | any = process.env.GEMINI_API_KEY 
    

    const imgBuffer = Buffer.from(image, 'base64');

    const image_path = path.join( 'temp_media',`${customer_code}.jpeg`);

    fs.writeFileSync(image_path, imgBuffer);

    const fileManager = new GoogleAIFileManager(API);
    const uploadResult = await fileManager.uploadFile(image_path,
        {
            mimeType: "image/jpeg",
            displayName: `Measure ${customer_code} - ${measure_type} - ${measure_month}`,
        },
    );

    fs.unlink(image_path, (err) => {
        if(err){
            console.log("Erro ao excluir arquivo: ", err)}
    })
    
    const image_url: string = uploadResult.file.uri

    const genAI = new GoogleGenerativeAI(API);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
        "Nesta imagem há um medidor de vazão de gás ou água. Nele há uma sequeência de algarismos, cada qual interno a um quadrado. Essa sequência representa o valor medido pelo medidor. Qual o valor medido por este instrumento? Me retorne apenas o número.",
        {
            fileData: {
                fileUri: uploadResult.file.uri,
                mimeType: uploadResult.file.mimeType,
            },
        },
    ]);

    const measure_value: string = result.response.text();

    if(measure_value && image_url){
        return {image_url, measure_value}
    }
    return {image_url: '', measure_value:''}
    
    
}

