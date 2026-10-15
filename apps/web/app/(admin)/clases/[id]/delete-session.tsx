'use client'
import {useState,useTransition} from 'react'
import {useRouter} from 'next/navigation'
import {Button} from '../../../../components/ui/button'
import {deleteSession} from '../actions'
import { DialogContent } from '../../../../components/ui/dialog-shell'
import { FormMessage } from '../../../../components/ui/form-message'
export function DeleteSessionButton({sessionId,compact=false,returnTo='/clases'}:{sessionId:string;compact?:boolean;returnTo?:string}){const[open,setOpen]=useState(false);const[busy,start]=useTransition();const router=useRouter();const[error,setError]=useState('');return <><button type="button" className={compact?'w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100':'inline-flex min-h-9 items-center rounded-xl bg-rose-700 px-3 text-xs font-semibold text-white hover:bg-rose-800'} onClick={()=>setOpen(true)}>Eliminar clase</button><DialogContent open={open} onOpenChange={setOpen} title="¿Eliminar esta clase?" description="Se borrarán las inscripciones y asistencias. Las clases con liquidaciones generadas no se pueden borrar.">{error?<FormMessage>{error}</FormMessage>:null}<div className="flex justify-end gap-2"><Button variant="secondary" onClick={()=>setOpen(false)}>Conservar clase</Button><Button variant="destructive" disabled={busy} onClick={()=>start(async()=>{const result=await deleteSession(sessionId);if(result.ok){setOpen(false);router.push(returnTo);router.refresh()}else setError(result.message)})}>{busy?'Eliminando…':'Eliminar clase'}</Button></div></DialogContent></>}
