export type SubscriptionStatus="Active"|"Pending"|"Expired"|"Cancelled"|"Suspended"|"Payment Failed"|"Trial";
export type Subscription={id:string;subscriber:string;email:string;workspace:string;plan:string;amount:number;cycle:"Monthly"|"Annual";start:string;expiry:string;status:SubscriptionStatus;payment:"Successful"|"Pending"|"Failed";reference:string;payments:string[]};


