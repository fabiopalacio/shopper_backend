//Declaração de interfaces e classes para facilitar a tipagem:
interface PostBody {
    image: string;
    customer_code: string;
    measure_datetime: string;
    measure_type: string;
}

interface PatchBody {
    measure_uuid: string;
    confirmed_value: number;
}

interface GetQuery {
    measure_type?: string;
}

interface Measures {
    measure_uuid: string;
    measure_datetime: string;
    measure_type: string;
    has_confirmed: boolean;
    image_url: string;
}

interface CustomerInfo {
    customer_code: string;
    measures: Measures[];
    
}


export {Measures,PatchBody,PostBody,GetQuery, CustomerInfo}