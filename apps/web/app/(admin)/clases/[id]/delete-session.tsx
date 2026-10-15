'use client'
import {useState,useTransition} from 'react'
import {useRouter} from 'next/navigation'
import {Button} from '../../../../components/ui/button'
import {deleteSession} from '../actions'
import { DialogContent } from '../../../../components/ui/dialog-shell'
import { FormMessage } from '../../../../components/ui/form-message'
import { useToast } from '../../../../components/ui/toast'
export function DeleteSessionButton({sessionId,returnTo='/clases'}:{sessionId:string;returnTo?:string}){const[open,setOpen]=useState(false);const[busy,start]=useTransition();const router=useRouter();const[error,setError]=useState('');const showToast=useToast();return <><button type="button" className="inline-flex min-h-11 items-center rounded-xl bg-rose-700 px-3 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2" onClick={()=>{setError('');setOpen(true)}}>Eliminar clase</button><DialogContent open={open} onOpenChange={setOpen} title="¿Eliminar esta clase?" description="Se borrarán las inscripciones y asistencias. Las clases con liquidaciones generadas no se pueden borrar.">{error?<FormMessage>{error}</FormMessage>:null}<div className="flex justify-end gap-2 px-5 py-5 sm:px-6"><Button type="button" variant="secondary" onClick={()=>setOpen(false)}>Conservar clase</Button><Button type="button" variant="destructive" disabled={busy} onClick={()=>start(async()=>{const result=await deleteSession(sessionId);if(result.ok){showToast(result.message);setOpen(false);router.push(returnTo)}else{setError(result.message);showToast(result.message,'error')}})}>{busy?'Eliminando…':'Eliminar clase'}</Button></div></DialogContent></>}
