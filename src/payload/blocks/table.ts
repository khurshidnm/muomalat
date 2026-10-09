import type { Block, FieldHook } from 'payload'

import { parseTableData } from '../../content/tabular'

/** Fills the hidden `rows` json from the pasted `data` text on every save. */
const parseRows: FieldHook = ({ siblingData, value }) =>
  typeof siblingData?.data === 'string' && siblingData.data.trim() !== '' ? parseTableData(siblingData.data) : value

/**
 * A data table (CMS-SPEC §3.4). Editors paste the cells into `data`; the hook
 * parses them into `rows`, which the serializer outputs. Cell rules: empty →
 * null, a number in Uzbek format → number, anything else → text. ART-8 checks
 * that every row has as many cells as there are columns.
 */
export const table: Block = {
  slug: 'table',
  labels: { singular: 'Jadval', plural: 'Jadvallar' },
  fields: [
    { name: 'caption', label: 'Sarlavha', type: 'text', required: true },
    {
      name: 'columns',
      label: 'Ustunlar',
      labels: { singular: 'Ustun', plural: 'Ustunlar' },
      type: 'array',
      required: true,
      admin: { description: 'Har bir ustun uchun bitta qator, chapdan oʻngga.' },
      fields: [
        { name: 'label', label: 'Nomi', type: 'text', required: true },
        {
          name: 'align',
          label: 'Tekislash',
          type: 'select',
          options: [
            { label: 'Chapga', value: 'left' },
            { label: 'Oʻngga (raqamlar)', value: 'right' },
          ],
        },
        { name: 'unit', label: 'Birlik', type: 'text', admin: { description: 'Sarlavhadan keyin koʻrsatiladi, masalan «mlrd soʻm» yoki «%».' } },
      ],
    },
    {
      name: 'data',
      label: 'Maʼlumotlar',
      type: 'textarea',
      required: true,
      admin: {
        description:
          'Excel yoki CSV dan nusxalang: har qator — jadval qatori, kataklar tab yoki nuqtali vergul (;) bilan ajratiladi. Vergul ajratuvchi emas: u oʻnlik belgisi (4,5). Minglik ajratuvchi — boʻsh joy (12 500). Boʻsh katak — maʼlumot yoʻq.',
      },
    },
    { name: 'rows', type: 'json', admin: { hidden: true }, hooks: { beforeChange: [parseRows] } },
    { name: 'note', label: 'Izoh', type: 'text' },
    { name: 'source', label: 'Manba', type: 'text', required: true },
  ],
}
