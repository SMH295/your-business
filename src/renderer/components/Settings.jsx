import React, { useState, useEffect } from 'react'
import { auth } from '../firebase'
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import Toast from './ui/Toast'
import { useT, LANGUAGES } from '../LanguageContext'

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">{label}</span>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  )
}

function InputRow({ label, type = 'text', value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <Field label={label}>
      <div className="relative w-56">
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(v => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
            {show ? 'Ocultar' : 'Ver'}
          </button>
        )}
      </div>
    </Field>
  )
}

function TelemetryToggle({ showToast, t }) {
  const [consent, setConsent] = useState(undefined)

  useEffect(() => {
    window.api.telemetry.getConsent().then(c => setConsent(c !== null ? c : false))
  }, [])

  async function toggle() {
    const newVal = !consent
    await window.api.telemetry.setConsent(newVal)
    setConsent(newVal)
    showToast(newVal ? t('settings.telOn') : t('settings.telOff'))
  }

  if (consent === undefined) return null

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {consent ? t('settings.telOn') : t('settings.telOff')}
      </span>
      <button
        onClick={toggle}
        className={`relative w-12 h-6 rounded-full transition-colors ${consent ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${consent ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

function ApiKeyField({ showToast }) {
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    window.api.config.get('geminiKey').then(k => { if (k) setSaved(true) })
  }, [])
  async function save() {
    if (!key.trim()) return
    await window.api.config.set('geminiKey', key.trim())
    setSaved(true); setKey(''); showToast('API Key guardada')
  }
  async function remove() {
    await window.api.config.set('geminiKey', '')
    setSaved(false); showToast('API Key eliminada')
  }
  if (saved) return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-green-600 font-semibold">✓ Configurada</span>
      <button onClick={remove} className="text-xs text-red-400 hover:text-red-600 transition-colors">Eliminar</button>
    </div>
  )
  return (
    <div className="flex gap-2 w-72">
      <input type="password" value={key} onChange={e => setKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()}
        placeholder="AIza..."
        className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      <button onClick={save} disabled={!key.trim()} className="px-3 py-1.5 bg-primary text-white text-sm font-semibold rounded-md disabled:opacity-50">Guardar</button>
    </div>
  )
}

export default function Settings({ negocio, onNegocioUpdate, darkMode, onToggleDark }) {
  const { t, lang, changeLang } = useT()
  const [toast, setToast] = useState(null)

  // Negocio name
  const [nombre, setNombre] = useState(negocio?.nombre || '')
  const [savingNombre, setSavingNombre] = useState(false)

  // Change password
  const [currentPass, setCurrentPass]   = useState('')
  const [newPass, setNewPass]           = useState('')
  const [confirmPass, setConfirmPass]   = useState('')
  const [savingPass, setSavingPass]     = useState(false)

  // Change email
  const [newEmail, setNewEmail]         = useState('')
  const [emailPass, setEmailPass]       = useState('')
  const [savingEmail, setSavingEmail]   = useState(false)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
  }

  async function handleSaveNombre() {
    if (!nombre.trim() || nombre.trim() === negocio?.nombre) return
    setSavingNombre(true)
    try {
      const updated = await window.api.negocio.update({ nombre: nombre.trim() })
      onNegocioUpdate(updated)
      showToast('Nombre actualizado')
    } catch {
      showToast('Error al guardar el nombre', 'error')
    } finally { setSavingNombre(false) }
  }

  async function handleChangePassword() {
    if (!currentPass || !newPass || !confirmPass) return showToast('Completá todos los campos', 'error')
    if (newPass !== confirmPass) return showToast('Las contraseñas nuevas no coinciden', 'error')
    if (newPass.length < 6) return showToast('La contraseña debe tener mínimo 6 caracteres', 'error')
    setSavingPass(true)
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPass)
      await reauthenticateWithCredential(auth.currentUser, cred)
      await updatePassword(auth.currentUser, newPass)
      setCurrentPass(''); setNewPass(''); setConfirmPass('')
      showToast('Contraseña actualizada')
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')
        showToast('La contraseña actual es incorrecta', 'error')
      else showToast('Error al cambiar la contraseña', 'error')
    } finally { setSavingPass(false) }
  }

  async function handleChangeEmail() {
    if (!newEmail || !emailPass) return showToast('Completá todos los campos', 'error')
    setSavingEmail(true)
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, emailPass)
      await reauthenticateWithCredential(auth.currentUser, cred)
      await updateEmail(auth.currentUser, newEmail.trim())
      setNewEmail(''); setEmailPass('')
      showToast('Correo actualizado')
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')
        showToast('La contraseña es incorrecta', 'error')
      else if (err.code === 'auth/email-already-in-use')
        showToast('Ese correo ya está en uso', 'error')
      else showToast('Error al cambiar el correo', 'error')
    } finally { setSavingEmail(false) }
  }

  async function handleExportCSV() {
    try {
      const ventas = await window.api.ventas.getToday()
      if (ventas.length === 0) return showToast('No hay ventas hoy para exportar', 'error')

      const rows = [['Orden', 'Fecha', 'Producto', 'Cantidad', 'Subtotal', 'Total orden']]
      ventas.forEach(v => {
        const items = v.detalle ? JSON.parse(v.detalle) : []
        if (items.length === 0) {
          rows.push([v.numero_orden, v.fecha_hora, '', '', '', v.total])
        } else {
          items.forEach((item, i) => {
            rows.push([
              i === 0 ? v.numero_orden : '',
              i === 0 ? v.fecha_hora : '',
              item.nombre, item.cantidad, item.subtotal,
              i === 0 ? v.total : ''
            ])
          })
        }
      })

      const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      a.href = url; a.download = `ventas-${date}.csv`
      a.click(); URL.revokeObjectURL(url)
      showToast(`${ventas.length} ventas exportadas`)
    } catch {
      showToast('Error al exportar', 'error')
    }
  }

  const btnSave = "px-4 py-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50"
  const btnSecondary = "px-4 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-md transition-colors"

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.title')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Apariencia */}
        <Section title={t('settings.appearance')}>
          <Field label={t('settings.theme')}>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {darkMode ? t('settings.dark') : t('settings.light')}
              </span>
              <button
                onClick={onToggleDark}
                className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-primary' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </Field>
        </Section>

        {/* Idioma */}
        <Section title={t('settings.language')}>
          <Field label={t('settings.language_label')}>
            <select
              value={lang}
              onChange={e => changeLang(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
                <option key={code} value={code}>{flag} {name}</option>
              ))}
            </select>
          </Field>
        </Section>

        {/* Negocio */}
        <Section title={t('settings.business')}>
          <InputRow label={t('settings.businessName')} value={nombre} onChange={setNombre} placeholder={t('settings.businessName')} />
          <div className="pt-3 flex justify-end">
            <button onClick={handleSaveNombre} disabled={savingNombre || nombre.trim() === negocio?.nombre} className={btnSave}>
              {savingNombre ? t('settings.saving') : t('settings.saveName')}
            </button>
          </div>
        </Section>

        {/* Cuenta - Contraseña */}
        <Section title={t('settings.changePass')}>
          <InputRow label={t('settings.currentPass')}  type="password" value={currentPass}  onChange={setCurrentPass}  placeholder={t('settings.currentPass')} />
          <InputRow label={t('settings.newPass')}       type="password" value={newPass}       onChange={setNewPass}       placeholder={t('settings.newPass')} />
          <InputRow label={t('settings.confirmPass')}   type="password" value={confirmPass}   onChange={setConfirmPass}   placeholder={t('settings.confirmPass')} />
          <div className="pt-3 flex justify-end">
            <button onClick={handleChangePassword} disabled={savingPass} className={btnSave}>
              {savingPass ? t('settings.saving') : t('settings.changePassBtn')}
            </button>
          </div>
        </Section>

        {/* Cuenta - Email */}
        <Section title={t('settings.changeEmail')}>
          <Field label={t('settings.currentEmail')}>
            <span className="text-sm text-gray-500 dark:text-gray-400">{auth.currentUser?.email}</span>
          </Field>
          <InputRow label={t('settings.newEmail')}      type="email"    value={newEmail}  onChange={setNewEmail}  placeholder="nuevo@correo.com" />
          <InputRow label={t('settings.currentPass')}   type="password" value={emailPass} onChange={setEmailPass} placeholder={t('settings.currentPass')} />
          <div className="pt-3 flex justify-end">
            <button onClick={handleChangeEmail} disabled={savingEmail} className={btnSave}>
              {savingEmail ? t('settings.saving') : t('settings.changeEmailBtn')}
            </button>
          </div>
        </Section>

        {/* API Key IA */}
        <Section title={t('settings.aiApi')}>
          <Field label="Gemini API Key">
            <ApiKeyField showToast={showToast} />
          </Field>
          <p className="text-xs text-gray-400 mt-2">
            Gratis en <strong>aistudio.google.com</strong> → Get API key → Create API key → elegí <strong>"Default Gemini Project"</strong>
          </p>
        </Section>

        {/* Privacidad */}
        <Section title={t('settings.privacy')}>
          <Field label={t('settings.telemetry')}>
            <TelemetryToggle showToast={showToast} t={t} />
          </Field>
        </Section>

        {/* Exportar */}
        <Section title={t('settings.data')}>
          <Field label={t('settings.exportToday')}>
            <button onClick={handleExportCSV} className={btnSecondary}>
              {t('settings.downloadCsv')}
            </button>
          </Field>
        </Section>

      </div>

      {toast && (
        <Toast
          message={toast.type === 'error' ? `✕ ${toast.msg}` : `✓ ${toast.msg}`}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
