import type { Payload } from 'payload'

import { isReadOnly, readOnlyFromEnv } from '../security/readOnly'

/**
 * The red banner of read-only mode (CMS-SPEC §12.10), above every admin page
 * (`admin.components.header`). Saving still shows the refusal; this says why
 * before anyone starts typing. Nothing renders in normal operation.
 */
export async function ReadOnlyBanner({ payload }: { payload: Payload }) {
  const on = await isReadOnly({ payload }).catch(() => false)
  if (!on) return null
  const how = readOnlyFromEnv()
    ? 'Server sozlamasi (CMS_READ_ONLY) bilan yoqilgan: uni faqat server administratori oʻchiradi.'
    : 'Sayt sozlamalari → Ishlash boʻlimida yoqilgan: administrator oʻchiradi.'
  return (
    <div role="alert" style={{ background: '#b42318', color: '#fff', padding: '8px 16px', fontWeight: 600, fontSize: 14, textAlign: 'center' }}>
      CMS faqat oʻqish rejimida: oʻzgartirishlar saqlanmaydi, rejali chop etish toʻxtatilgan. {how}
    </div>
  )
}

export default ReadOnlyBanner
