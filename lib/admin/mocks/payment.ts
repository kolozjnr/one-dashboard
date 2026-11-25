import type { Payment } from '../types/payment';

export const seed:Payment[]=[
 {ref:"TRX-PS-874201",subscriber:"Olivia Rhye",email:"olivia@northstar.studio",workspace:"Northstar Studio",plan:"Growth",amount:288,currency:"USD",method:"Card · Visa •••• 4242",gateway:"Paystack",gatewayId:"ps_test_874201",date:"2025-11-12",status:"Successful",subscription:"SUB-2048",history:["Successful · Nov 12, 2025 · $288.00","Payment initiated · Nov 12, 2025"]},
 {ref:"TRX-ST-874196",subscriber:"Phoenix Baker",email:"phoenix@useorbit.io",workspace:"Orbit Creative",plan:"Pro",amount:49,currency:"USD",method:"Card · Mastercard •••• 5521",gateway:"Stripe",gatewayId:"pi_mock_874196",date:"2025-11-03",status:"Successful",subscription:"SUB-2047",history:["Successful · Nov 03, 2025 · $49.00","Payment initiated · Nov 03, 2025"]},
 {ref:"TRX-FW-873510",subscriber:"Natali Craig",email:"natali@westside.co",workspace:"Westside Market",plan:"Starter",amount:29500,currency:"NGN",method:"Card · Verve •••• 1098",gateway:"Flutterwave",gatewayId:"FLW-MOCK-873510",date:"2025-11-09",status:"Failed",subscription:"SUB-2046",history:["Failed · Nov 09, 2025 · Insufficient funds","Payment initiated · Nov 09, 2025"]},
 {ref:"TRX-PS-872901",subscriber:"Andi Lane",email:"andi@layers.design",workspace:"Layers Design",plan:"Starter",amount:228,currency:"USD",method:"Card · Visa •••• 8130",gateway:"Paystack",gatewayId:"ps_test_872901",date:"2025-11-07",status:"Pending",subscription:"SUB-2045",history:["Pending · Nov 07, 2025 · Awaiting gateway confirmation","Payment initiated · Nov 07, 2025"]},
 {ref:"TRX-ST-871055",subscriber:"Alec Whitten",email:"alec@commonthread.co",workspace:"Common Thread",plan:"Pro",amount:49,currency:"USD",method:"Card · Visa •••• 9032",gateway:"Stripe",gatewayId:"pi_mock_871055",date:"2025-11-22",status:"Partially Refunded",subscription:"SUB-2044",history:["Partially refunded · Nov 23, 2025 · $20.00","Successful · Nov 22, 2025 · $49.00"]},
 {ref:"TRX-FW-870442",subscriber:"Rory Morrison",email:"rory@studioform.io",workspace:"Studio Form",plan:"Growth",amount:0,currency:"USD",method:"Trial",gateway:"Other",gatewayId:"trial_870442",date:"2025-11-10",status:"Successful",subscription:"SUB-2043",history:["Trial started · Nov 10, 2025 · $0.00"]},
 {ref:"TRX-PS-868120",subscriber:"Kate Morrison",email:"kate@finch.co",workspace:"Finch & Co",plan:"Pro",amount:49,currency:"USD",method:"Card · Visa •••• 1180",gateway:"Paystack",gatewayId:"ps_test_868120",date:"2025-10-01",status:"Refunded",subscription:"SUB-2042",history:["Refunded · Oct 04, 2025 · $49.00","Successful · Oct 01, 2025 · $49.00"]},
];

/**
 * Gateways the payments UI must accommodate. Add a new provider here and it
 * appears in the gateway filter automatically — no page changes required.
 * "Other" is a catch-all for providers that are not yet first-class citizens.
 */
export const PAYMENT_GATEWAYS = ["Paystack","Flutterwave","Stripe","Other"] as const;
