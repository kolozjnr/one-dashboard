export type Ticket={id:string;subject:string;customer:string;email:string;workspace:string;subscription:string;category:string;priority:"Low"|"Normal"|"High"|"Urgent";status:"Open"|"In Progress"|"Waiting for Customer"|"Resolved"|"Closed";assigned:string;created:string;updated:string;message:string;conversation:{by:string;text:string;time:string;internal?:boolean}[]};

