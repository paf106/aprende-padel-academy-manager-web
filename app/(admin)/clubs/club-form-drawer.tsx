'use client'

import { useState } from 'react'
import { FormDrawer } from '@/components/crud/form-drawer'
import { ColorPicker } from '@/components/ds/color-picker'
import { Field, TextField } from '@/components/ds/field'
import { ImageUpload } from '@/components/ds/image-upload'
import { useToast } from '@/components/ds/toast'
import { clubSchema, emptyClubInput, type ClubInput } from '@/lib/classes/club-schema'
import { validate } from '@/lib/core/validation'
import type { Club } from '@/lib/demo/data'
import { useDemo } from '@/lib/demo/use-demo'

export function ClubFormDrawer({ club, onClose }: { club?: Club; onClose: () => void }) {
  const toast = useToast()
  const { actions } = useDemo()
  const [values, setValues] = useState<ClubInput>(
    club
      ? {
          name: club.name,
          address: club.address,
          city: club.city,
          postalCode: club.postalCode,
          courts: club.courts,
          color: club.color as ClubInput['color'],
          photo: club.photo,
        }
      : emptyClubInput,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof ClubInput>(key: K, value: ClubInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const submit = () => {
    const result = validate(clubSchema, values)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    if (club) actions.updateClub(club.id, result.data)
    else actions.createClub(result.data)
    toast(club ? 'Sede actualizada.' : 'Sede creada.')
    onClose()
  }

  return (
    <FormDrawer
      open
      title={club ? 'Editar sede' : 'Nueva sede'}
      submitLabel={club ? 'Guardar cambios' : 'Crear sede'}
      onSubmit={submit}
      onClose={onClose}
    >
      <Field label="Foto de la sede">
        <ImageUpload value={values.photo} error={errors.photo} onChange={(photo) => set('photo', photo)} />
      </Field>
      <TextField
        id="club-name"
        label="Nombre"
        value={values.name}
        error={errors.name}
        onChange={(e) => set('name', e.target.value)}
      />
      <TextField
        id="club-address"
        label="Dirección"
        value={values.address}
        error={errors.address}
        onChange={(e) => set('address', e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          id="club-city"
          label="Población"
          value={values.city}
          error={errors.city}
          onChange={(e) => set('city', e.target.value)}
        />
        <TextField
          id="club-postal"
          label="Código postal"
          inputMode="numeric"
          value={values.postalCode}
          error={errors.postalCode}
          onChange={(e) => set('postalCode', e.target.value)}
        />
      </div>
      <TextField
        id="club-courts"
        type="number"
        min={1}
        label="Número de pistas"
        value={values.courts}
        error={errors.courts}
        onChange={(e) => set('courts', Number(e.target.value))}
      />
      <Field label="Color en el calendario">
        <ColorPicker
          label="Color en el calendario"
          value={values.color}
          onChange={(color) => set('color', color)}
        />
      </Field>
    </FormDrawer>
  )
}
