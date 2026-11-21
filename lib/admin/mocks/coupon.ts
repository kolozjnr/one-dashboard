import type { Coupon } from '../types/coupon';

export const seed:Coupon[]=[
 {id:1,name:"Launch special",code:"LAUNCH20",description:"Welcome offer for new subscribers",type:"Percentage",value:20,plans:["Starter","Professional","Business"],cycle:"Any",max:500,perUser:1,minimum:0,start:"2025-01-01",expiry:"2026-12-31",active:true,used:186,redemptions:[{user:"Olivia Rhye",email:"olivia@northstar.studio",date:"Nov 12, 2025",discount:"$57.60",plan:"Business"},{user:"Phoenix Baker",email:"phoenix@useorbit.io",date:"Nov 03, 2025",discount:"$9.80",plan:"Professional"}]},
 {id:2,name:"Annual saving",code:"ANNUAL15",description:"Extra savings on annual billing",type:"Percentage",value:15,plans:["Professional","Business"],cycle:"Annual",max:300,perUser:1,minimum:100, start:"2025-01-01",expiry:"2026-06-30",active:true,used:92,redemptions:[{user:"Andi Lane",email:"andi@layers.design",date:"Aug 16, 2025",discount:"$34.20",plan:"Starter"}]},
 {id:3,name:"Spring credit",code:"SPRING10",description:"Fixed credit toward a paid plan",type:"Fixed Amount",value:10,plans:["Starter","Professional"],cycle:"Monthly",max:100,perUser:1,minimum:19,start:"2025-01-01",expiry:"2025-04-30",active:false,used:100,redemptions:[]},
];
