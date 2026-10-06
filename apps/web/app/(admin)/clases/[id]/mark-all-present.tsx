'use client'
import {useState,useTransition} from 'react'
import {markAllAttendance} from '../actions'
import {Button} from '../../../../components/ui/button'
export function MarkAllPresentButton({sessionId}:{sessionId:string}){const[busy,start]=useTransition();const[message,setMessage]=useState('');return <div><Button size="sm" variant="secondary" disabled={busy} onClick={()=>start(async()=>{const r=await markAllAttendance(sessionId);setMessage(r.message)})}>{busy?'Guardando…':'Marcar todos presentes'}</Button>{message?<span className="field-help" role="status">{message}</span>:null}</div>}
