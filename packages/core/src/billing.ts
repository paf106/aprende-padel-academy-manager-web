export type SessionForSettlement={sessionId:string;startsAt:string;durationMinutes:number;enrolledCount:number;status:'pending'|'completed'|'cancelled';teacherId:string}
export type TeacherRate={belowThresholdCents:number;thresholdRateCents:number;studentThreshold:number}
export function calculateTeacherSettlement(sessions:SessionForSettlement[],period:string,rate:TeacherRate,timeZone='Europe/Madrid'){
 const start=new Date(`${period}-01T00:00:00Z`)
 const end=new Date(start);end.setUTCMonth(end.getUTCMonth()+1)
 return sessions.filter(session=>{if(session.status!=='completed')return false;const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit'}).formatToParts(new Date(session.startsAt));return `${parts.find(p=>p.type==='year')?.value}-${parts.find(p=>p.type==='month')?.value}`===period}).map(session=>{const hourly= session.enrolledCount>=rate.studentThreshold?rate.thresholdRateCents:rate.belowThresholdCents;return{...session,ratePerHourCents:hourly,amountCents:Math.round(hourly*session.durationMinutes/60)}})
}
export function calculateMonthlyStudentCharge(amountCents:number){if(!Number.isInteger(amountCents)||amountCents<0)throw new Error('La cuota mensual debe ser un importe entero no negativo en céntimos');return amountCents}
export function paymentBalance(dueCents:number,transactions:number[]){const paid=transactions.reduce((total,amount)=>total+amount,0);return{paidCents:paid,balanceCents:Math.max(0,dueCents-paid),status:paid<=0?'pending':paid<dueCents?'partial':'paid'} as const}
