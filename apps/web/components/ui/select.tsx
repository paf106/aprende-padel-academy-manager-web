'use client'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@aprende-padel/ui/cn'
export const Select=SelectPrimitive.Root
export const SelectValue=SelectPrimitive.Value
export function SelectTrigger({className,...props}:ComponentProps<typeof SelectPrimitive.Trigger>){return <SelectPrimitive.Trigger className={cn('select-trigger',className)} {...props}><SelectPrimitive.Value/>{props.children}<SelectPrimitive.Icon><ChevronDown size={14}/></SelectPrimitive.Icon></SelectPrimitive.Trigger>}
export function SelectContent({className,...props}:ComponentProps<typeof SelectPrimitive.Content>){return <SelectPrimitive.Portal><SelectPrimitive.Content className={cn('select-content',className)} position="popper" {...props}/></SelectPrimitive.Portal>}
export function SelectItem({className,children,...props}:ComponentProps<typeof SelectPrimitive.Item>){return <SelectPrimitive.Item className={cn('select-item',className)} {...props}><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText><SelectPrimitive.ItemIndicator><Check size={14}/></SelectPrimitive.ItemIndicator></SelectPrimitive.Item>}
