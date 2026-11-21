export type Coupon={id:number;name:string;code:string;description:string;type:"Percentage"|"Fixed Amount";value:number;plans:string[];cycle:string;max:number;perUser:number;minimum:number;start:string;expiry:string;active:boolean;used:number;redemptions:{user:string;email:string;date:string;discount:string;plan:string}[]};

