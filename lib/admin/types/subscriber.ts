export type Subscriber = { id:number; workspace:string; owner:string; email:string; plan:string; status:"Active"|"Suspended"|"Past due"|"Cancelled"; members:number; accounts:number; revenue:string; joined:string; cycle:string; start:string; expiry:string; renewal:string; reports:number; limit:number; seats:number; connected:string[]; history:string[] };

