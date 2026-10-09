import type { Block, FieldHook } from 'payload'

import { parseChartData } from '../../content/tabular'

/** Fills the hidden `parsed` json from the `data` text on every save. */
const parseChart: FieldHook = ({ siblingData, value }) =>
  typeof siblingData?.data === 'string' && siblingData.data.trim() !== '' && (siblingData.kind === 'bar' || siblingData.kind === 'line')
    ? parseChartData(siblingData.kind, siblingData.data)
    : value

/**
 * A bar or line chart (CMS-SPEC §3.4), drawn on the site by the existing
 * BarChart / LineChart components. ART-8 and ART-10 check that the data
 * parses and the series lengths match.
 */
export const chart: Block = {
  slug: 'chart',
  labels: { singular: 'Diagramma', plural: 'Diagrammalar' },
  fields: [
    {
      name: 'kind',
      label: 'Turi',
      type: 'select',
      required: true,
      defaultValue: 'bar',
      options: [
        { label: 'Ustunli', value: 'bar' },
        { label: 'Chiziqli', value: 'line' },
      ],
    },
    { name: 'title', label: 'Sarlavha', type: 'text', required: true },
    { name: 'subtitle', label: 'Kichik sarlavha', type: 'text' },
    { name: 'unit', label: 'Birlik', type: 'text', required: true, admin: { description: 'Masalan «mlrd soʻm» yoki «%».' } },
    {
      name: 'categoryLabel',
      label: 'Toifalar ustuni nomi',
      type: 'text',
      admin: { condition: (_, sibling) => sibling?.kind === 'bar', description: 'Maʼlumotlar jadvalidagi birinchi ustun sarlavhasi; boʻsh qolsa «Toifa».' },
    },
    {
      name: 'xLabel',
      label: 'Davr ustuni nomi',
      type: 'text',
      admin: { condition: (_, sibling) => sibling?.kind === 'line', description: 'Masalan «Oy»; boʻsh qolsa «Davr».' },
    },
    {
      name: 'data',
      label: 'Maʼlumotlar',
      type: 'textarea',
      required: true,
      admin: {
        description:
          'Ustunli: har qatorda «nom;qiymat», ajratib koʻrsatiladigan ustun uchun oxiriga «;*». Chiziqli: birinchi qator «Davr;Seriya A;Seriya B», keyin har davr uchun bir qator. Raqamlar oʻzbekcha yoziladi (4,5); nom va seriya nomlarida «;» boʻlmasin.',
      },
    },
    { name: 'parsed', type: 'json', admin: { hidden: true }, hooks: { beforeChange: [parseChart] } },
    { name: 'source', label: 'Manba', type: 'text', required: true },
    { name: 'note', label: 'Izoh', type: 'text' },
  ],
}
