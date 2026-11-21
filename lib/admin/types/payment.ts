export type PaymentStatus="Successful"|"Pending"|"Failed"|"Refunded"|"Partially Refunded";
export type Payment={ref:string;subscriber:string;email:string;workspace:string;plan:string;amount:number;currency:"USD"|"NGN";method:string;gateway:string;gatewayId:string;date:string;status:PaymentStatus;subscription:string;history:string[]};


