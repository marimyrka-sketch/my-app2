import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type RefObject } from 'react'
import { Theme, presetGpnDefault } from '@consta/uikit/Theme'
import { Button } from '@consta/uikit/Button'
import { ContextMenu } from '@consta/uikit/ContextMenu'
import { Select } from '@consta/uikit/Select'
import { Tabs } from '@consta/uikit/Tabs'
import { Text } from '@consta/uikit/Text'
import { TextField } from '@consta/uikit/TextField'
import { withTooltip } from '@consta/uikit/withTooltip'
import { IconAttach } from '@consta/icons/IconAttach'
import { IconArrowDown } from '@consta/icons/IconArrowDown'
import { IconArrowRight } from '@consta/icons/IconArrowRight'
import { IconClose } from '@consta/icons/IconClose'
import { IconEdit } from '@consta/icons/IconEdit'
import { IconHamburger } from '@consta/icons/IconHamburger'
import { IconKebab } from '@consta/icons/IconKebab'
import { IconReply } from '@consta/icons/IconReply'
import { IconTrash } from '@consta/icons/IconTrash'
import type { IconComponent } from '@consta/icons/Icon'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import './App.css'

echarts.use([BarChart, LineChart, AriaComponent, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

type Well = { id: number; name: string; x: number; y: number; status: 'alert' | 'ok' | 'active'; icon: string; comments: number }
type Attachment = { name: string; size: number; type: string }
type PendingAttachment = { file: File; previewUrl?: string }
type Comment = { id?: string; parentId?: string; initials: string; author: string; time: string; text: string; root?: boolean; reply?: boolean; attachments?: Attachment[] }
type PageComment = Comment & { id: string; wellId: number; path: string; unread?: boolean; parentId?: string; replyTo?: string; replyToText?: string }

const wells: Well[] = [
  { id: 12, name: 'Скважина-12', x: 47, y: 49, status: 'alert', icon: '/assets/well-alert.svg', comments: 3 },
  { id: 20, name: 'Скважина-20', x: 54, y: 56, status: 'active', icon: '/assets/well-active.svg', comments: 12 },
  { id: 11, name: 'Скважина-11', x: 63, y: 54, status: 'ok', icon: '/assets/well-ok.svg', comments: 1 },
]

const makeToolbarIcon = (src: string) => (({ className }: { className?: string }) => (
  <span className={`tool-icon ${className ?? ''}`} style={{ '--tool-icon': `url(${src})` } as CSSProperties} />
)) as unknown as IconComponent

const ToolbarButton = withTooltip({ className: 'toolbar-tooltip', direction: 'downCenter', spareDirection: 'upCenter', size: 'xs', appearTimeout: 300, exitTimeout: 100 })(Button)

const primaryTools = [
  { icon: makeToolbarIcon('/assets/IconInfo.svg'), label: 'Информация' },
  { icon: makeToolbarIcon('/assets/IconSearchStroked.svg'), label: 'Поиск' },
  { icon: makeToolbarIcon('/assets/IconLayers.svg'), label: 'Слои' },
  { icon: makeToolbarIcon('/assets/IconColorFill.svg'), label: 'Заливка' },
  { icon: makeToolbarIcon('/assets/IconComment.svg'), label: 'Комментарии' },
  { icon: makeToolbarIcon('/assets/AreaChart.svg'), label: 'График области' },
]

const commentTools = [
  { icon: makeToolbarIcon('/assets/IconCommentAdd.svg'), label: 'Добавить комментарий' },
  { icon: makeToolbarIcon('/assets/IconCommentEye.svg'), label: 'Показать комментарии' },
  { icon: makeToolbarIcon('/assets/IconRuler.svg'), label: 'Линейка' },
]

const assistantTools = [
  { icon: makeToolbarIcon('/assets/IconInfo.svg'), label: 'Информация' },
  { icon: makeToolbarIcon('/assets/IconComment.svg'), label: 'Комментарии' },
  { icon: makeToolbarIcon('/assets/IconCommentAdd.svg'), label: 'Добавить комментарий' },
  { icon: makeToolbarIcon('/assets/IconCommentEye.svg'), label: 'Показать комментарии' },
]

const sections = [
  { id: 'digital', label: 'Схема цифровых двойников' },
  { id: 'visual-assistant', label: 'Визуальный ассистент' },
]

const commentMenuItems = [
  { key: 'edit', label: 'Редактировать', leftIcon: IconEdit },
  { key: 'delete', label: 'Удалить', leftIcon: IconTrash, status: 'alert' as const },
]
const pageCommentMenuItems = [
  { key: 'open', label: 'Открыть комментарий', leftIcon: IconArrowRight },
  { key: 'edit', label: 'Редактировать', leftIcon: IconEdit },
  { key: 'reply', label: 'Ответить', leftIcon: IconReply },
  { key: 'delete', label: 'Удалить', leftIcon: IconTrash, status: 'alert' as const },
]
const pageReplyMenuItems = pageCommentMenuItems.filter((item) => item.key !== 'reply')
const initialComments: Comment[] = [
  { id: 'thread-1', initials: 'ИД', author: 'Иванов И. И., начальник цеха добычи', time: '17:16 15.12.2024', text: 'По скважине зафиксировано снижение дебита на 8%. Прошу проверить режим работы насоса и актуальность замера.', root: true },
  { id: 'thread-2', parentId: 'thread-1', initials: 'СЛ', author: 'Соколова Л. Д., ведущий технолог', time: '20:16 15.12.2024', text: 'Замер подтверждён. Давление на приёме ЭЦН ниже расчётного, запланировали диагностику на утреннюю смену.', reply: true },
  { id: 'thread-3', initials: 'АП', author: 'Петров А. П., главный геолог', time: '10:24 16.12.2024', text: 'По геологической модели приток стабилен. Рекомендую сначала исключить влияние наземного оборудования.' },
  { id: 'thread-4', initials: 'КН', author: 'Кузнецова Н. В., инженер по добыче', time: '11:08 16.12.2024', text: 'Проверила телеметрию: скачков температуры и вибрации за последние сутки не было.' },
  { id: 'thread-5', initials: 'МР', author: 'Морозов Р. С., диспетчер промысла', time: '12:31 16.12.2024', text: 'Заявка №4821 создана, выезд бригады назначен на 08:30.' },
  { id: 'thread-6', initials: 'ЕА', author: 'Егорова А. М., специалист ППД', time: '14:05 16.12.2024', text: 'Приёмистость ближайшей нагнетательной скважины без отклонений. Влияние системы ППД маловероятно.' },
]

const initialPageComments: PageComment[] = [
  { id: 'page-1', wellId: 20, initials: 'СЛ', author: 'Соколова Л. Д., ведущий технолог', path: 'ЦДНГ-2 / Северное месторождение / Скважина-20', time: '17:16 15.12.2024', text: 'Дебит снизился на 8% относительно планового значения. Нужна проверка режима ЭЦН.', unread: true },
  { id: 'page-2', wellId: 12, initials: 'АП', author: 'Петров А. П., главный геолог', path: 'ЦДНГ-2 / Северное месторождение / Скважина-12', time: '13:20 14.12.2024, ред.', text: 'Обводнённость растёт третьи сутки. Предлагаю уточнить профиль притока перед корректировкой режима.', unread: true },
  { id: 'page-3', wellId: 11, initials: 'КН', author: 'Кузнецова Н. В., инженер по добыче', path: 'ЦДНГ-1 / Южное месторождение / Скважина-11', time: '12:48 14.12.2024', text: 'Телеметрия восстановлена, пропуски данных за ночную смену загружены в архив.' },
  { id: 'page-4', wellId: 20, initials: 'МР', author: 'Морозов Р. С., диспетчер промысла', path: 'ЦДНГ-2 / Северное месторождение / Скважина-20', time: '11:42 14.12.2024', text: 'Бригада подтвердила выезд на диагностику. Ориентировочное время прибытия — 08:30.' },
  { id: 'page-5', wellId: 12, initials: 'ЕА', author: 'Егорова А. М., специалист ППД', path: 'ЦДНГ-2 / Северное месторождение / Скважина-12', time: '10:15 13.12.2024', text: 'Отклонений по ближайшему нагнетательному фонду не выявлено, давление поддерживается в норме.' },
  { id: 'page-6', wellId: 11, initials: 'ВК', author: 'Волков К. О., механик участка', path: 'ЦДНГ-1 / Южное месторождение / Скважина-11', time: '09:05 12.12.2024', text: 'Осмотр устьевой арматуры выполнен. Утечек и замечаний по герметичности нет.' },
]

const getAvatarTone = (initials: string) => `tone-${Array.from(initials).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 6}`

const CommentGlyph = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M8 1.5A6.1 6.1 0 0 0 2.05 9l-.8 4.05a.65.65 0 0 0 .76.76l4.07-.78A6.1 6.1 0 1 0 8 1.5Z" />
  </svg>
)

const formatCommentCount = (count: number) => count > 99 ? '99+' : String(count)

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

type PageCommentItemProps = {
  comment: PageComment
  mode: 'edit' | 'reply' | null
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  onMenu: (comment: PageComment, anchor: HTMLElement) => void
}

const PageCommentItem = ({ comment, mode, draft, onDraftChange, onSubmit, onCancel, onMenu }: PageCommentItemProps) => (
  <article className={`page-comment${comment.reply ? ' is-reply' : ''}`}>
    <span className={`avatar ${getAvatarTone(comment.initials)}`}>{comment.initials}</span>
    <div className="page-comment-content">
      <div className="page-comment-author">{comment.unread && <i aria-label="Новый комментарий" />}<strong>{comment.author}</strong><Button className="page-comment-menu" size="xs" view="clear" onlyIcon iconLeft={IconKebab} label={`Действия с комментарием ${comment.author}`} onClick={(event) => onMenu(comment, event.currentTarget as HTMLElement)} /></div>
      <small>{comment.path}</small>
      <small>{comment.time}</small>
      {comment.replyTo && <div className="page-comment-reply-reference"><IconReply size="xs" aria-hidden="true" /><span title={comment.replyToText}>Ответ на: {comment.replyTo}{comment.replyToText ? ` — ${comment.replyToText}` : ''}</span></div>}
      <p>{comment.text}</p>
      {mode && <form className="page-comment-inline-form" action="#" method="post" onSubmit={onSubmit}>
        <label className="visually-hidden" htmlFor={`page-comment-${mode}-${comment.id}`}>{mode === 'edit' ? 'Текст комментария' : 'Текст ответа'}</label>
        <textarea id={`page-comment-${mode}-${comment.id}`} name={mode === 'edit' ? 'comment' : 'reply'} rows={3} autoFocus value={draft} onChange={(event) => onDraftChange(event.target.value)} />
        <div className="page-comment-inline-actions"><Button size="xs" type="submit" disabled={!draft.trim()} label={mode === 'edit' ? 'Сохранить' : 'Ответить'} /><Button size="xs" view="clear" type="button" label="Отмена" onClick={onCancel} /></div>
      </form>}
    </div>
  </article>
)

const assistantMonths = ['Янв ’25', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
const assistantBars = [48, 72, 58, 43, 54, 49, 44, 41, 40, 55, 65, 57]
const assistantOil = [42, 36, 58, 52, 33, 41, 47, 34, 51, 43, 36, 54]
const assistantPlan = [35, 47, 40, 27, 38, 45, 31, 36, 48, 42, 34, 50]
const assistantTabs = ['Ключевые показатели', 'Работа с фондом', 'Недоборы', 'ГТМ', 'Потенциал', 'Сервис', 'Видеоаналитика'].map((label) => ({ label }))
const assistantCommentContexts = [
  { line: 'График добычи нефти', period: 'Мар ’25' },
  { line: 'Факт', period: 'Авг ’25' },
]

function AssistantEChart({ showCommentMarkers, commentModeActive, commentCount, highlightedCommentContext, onOpenComments, onAddComment }: { showCommentMarkers: boolean; commentModeActive: boolean; commentCount: number; highlightedCommentContext: string | null; onOpenComments: (context: string) => void; onAddComment: (context: string, text: string, attachments: Attachment[]) => void }) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const chartFileInputRef = useRef<HTMLInputElement | null>(null)
  const [markerPositions, setMarkerPositions] = useState<Array<{ x: number; y: number; count: number; unread?: boolean; label: string }>>([])
  const [addedCommentMarkers, setAddedCommentMarkers] = useState<Array<{ dataIndex: number; value: number; count: number; unread?: boolean; label: string }>>([])
  const [commentTarget, setCommentTarget] = useState<{ label: string; index: number; value: number; seriesType: 'bar' | 'line' } | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [chartAttachments, setChartAttachments] = useState<File[]>([])

  useEffect(() => {
    if (!commentModeActive) {
      setCommentTarget(null)
      setCommentDraft('')
      setChartAttachments([])
    }
  }, [commentModeActive])

  useEffect(() => {
    if (!chartRef.current) return
    const chart = echarts.init(chartRef.current, undefined, { renderer: 'canvas' })
    const fact = assistantBars.map((value, index) => index < 9 ? Math.round(value * 56) : null)
    const forecast = assistantBars.map((value, index) => index >= 9 ? Math.round(value * 56) : null)
    chart.setOption({
      animationDuration: 450,
      color: ['#ff7479', '#dfe9ee', '#12b47e', '#0099e5'],
      aria: { enabled: true, decal: { show: false }, description: 'График добычи нефти по месяцам за 2025 год: факт, прогноз, план и фактическая добыча.' },
      tooltip: { show: !commentModeActive, trigger: 'axis', backgroundColor: '#fff', borderColor: 'rgba(0,65,102,.2)', textStyle: { color: '#002033', fontFamily: 'Inter', fontSize: 12 } },
      legend: { right: 0, top: 4, orient: 'vertical', itemWidth: 8, itemHeight: 8, textStyle: { color: '#002033', fontFamily: 'Inter', fontSize: 10 } },
      grid: { left: 44, right: 132, top: 12, bottom: 28, containLabel: false },
      xAxis: { type: 'category', data: assistantMonths, axisTick: { show: true }, axisLine: { lineStyle: { color: 'rgba(0,65,102,.25)' } }, axisLabel: { color: '#002033', fontFamily: 'Inter', fontSize: 10, interval: 0 }, splitLine: { show: true, lineStyle: { type: 'dashed', color: 'rgba(0,65,102,.12)' } } },
      yAxis: { type: 'value', min: 0, max: 6000, interval: 1000, axisLabel: { color: '#002033', fontFamily: 'Inter', fontSize: 10 }, axisLine: { show: true, lineStyle: { color: 'rgba(0,65,102,.25)' } }, splitLine: { lineStyle: { type: 'dashed', color: 'rgba(0,65,102,.16)' } } },
      series: [
        { name: 'Факт', type: 'bar', stack: 'production', data: fact, barWidth: '72%', label: { show: true, position: 'inside', color: '#fff', fontSize: 9 }, emphasis: commentModeActive ? { itemStyle: { borderColor: '#ff00c8', borderWidth: 3 } } : { disabled: true } },
        { name: 'Прогноз', type: 'bar', stack: 'production', data: forecast, barWidth: '72%', label: { show: true, position: 'inside', color: 'rgba(0,32,51,.35)', fontSize: 9 }, emphasis: commentModeActive ? { itemStyle: { borderColor: '#ff00c8', borderWidth: 3 } } : { disabled: true } },
        { name: 'СП', type: 'line', data: assistantPlan.map((value) => Math.round(value * 95)), symbol: commentModeActive ? 'circle' : 'none', symbolSize: commentModeActive ? 14 : 7, itemStyle: { borderWidth: 2 }, emphasis: commentModeActive ? { scale: 1.35, itemStyle: { color: '#fff', borderColor: '#ff00c8', borderWidth: 3 } } : { disabled: true }, lineStyle: { width: 2 } },
        { name: 'График добычи нефти', type: 'line', data: assistantOil.map((value) => Math.round(value * 95)), symbol: commentModeActive ? 'circle' : 'none', symbolSize: commentModeActive ? 14 : 7, itemStyle: { borderWidth: 2 }, emphasis: commentModeActive ? { scale: 1.35, itemStyle: { color: '#fff', borderColor: '#ff00c8', borderWidth: 3 } } : { disabled: true }, lineStyle: { width: 2 } },
      ],
    })
    chart.on('click', (params) => {
      if (!commentModeActive || params.componentType !== 'series' || typeof params.dataIndex !== 'number') return
      const month = assistantMonths[params.dataIndex]
      const period = month.includes('’') ? month : `${month} ’25`
      const pointValue = Number(Array.isArray(params.value) ? params.value.at(-1) : params.value)
      setCommentTarget({ label: `${params.seriesName} / ${period}`, index: params.dataIndex, value: Number.isFinite(pointValue) ? pointValue : 0, seriesType: params.seriesType === 'bar' ? 'bar' : 'line' })
      setCommentDraft('')
      setChartAttachments([])
    })
    const markerData = [...[
      { dataIndex: 2, value: Math.round(assistantOil[2] * 95), count: commentCount, label: 'График добычи нефти / Мар ’25' },
      { dataIndex: 7, value: fact[7] ?? 0, count: commentCount, unread: true, label: 'Факт / Авг ’25' },
    ], ...addedCommentMarkers]
    const updateMarkerPositions = () => {
      const gridLeft = 44
      const gridRight = 132
      const gridTop = 12
      const gridBottom = 28
      const plotWidth = chart.getWidth() - gridLeft - gridRight
      const plotHeight = chart.getHeight() - gridTop - gridBottom
      setMarkerPositions(markerData.map((marker) => ({
        ...marker,
        x: gridLeft + plotWidth * ((marker.dataIndex + 0.5) / assistantMonths.length),
        y: gridTop + plotHeight * (1 - marker.value / 6000),
      })))
    }
    chart.on('finished', updateMarkerPositions)
    const observer = new ResizeObserver(() => { chart.resize(); requestAnimationFrame(updateMarkerPositions) })
    observer.observe(chartRef.current)
    requestAnimationFrame(updateMarkerPositions)
    return () => { observer.disconnect(); chart.dispose() }
  }, [addedCommentMarkers, commentCount, commentModeActive])

  const composerPosition = commentTarget ? (() => {
    const xRatio = (commentTarget.index + .5) / assistantMonths.length
    const centeredValue = commentTarget.seriesType === 'bar' ? commentTarget.value / 2 : commentTarget.value
    const yRatio = 1 - Math.min(6000, Math.max(0, centeredValue)) / 6000
    return {
      '--target-x': `calc(44px + ${xRatio * 100}% - ${176 * xRatio}px)`,
      '--target-y': `calc(12px + ${yRatio * 100}% - ${40 * yRatio}px)`,
    } as CSSProperties
  })() : undefined

  return <div className="assistant-echart-wrap">
    <div ref={chartRef} className="assistant-echart" role="img" aria-label="Комбинированный график добычи нефти за 2025 год с маркерами комментариев" />
    {showCommentMarkers && markerPositions.map((marker) => <button type="button" key={marker.label} className={`comment-marker assistant-chart-comment-marker ${marker.unread ? 'has-unread' : 'is-read'}`} style={{ '--marker-x': `${marker.x}px`, '--marker-y': `${marker.y}px` } as CSSProperties} aria-label={`${marker.label}: ${marker.count} комментариев`} aria-controls="assistant-object-panel" aria-pressed={highlightedCommentContext === marker.label} onClick={() => onOpenComments(marker.label)}>
      <CommentGlyph />
      <span>{formatCommentCount(marker.count)}</span>
      <i className="unread-indicator" aria-hidden="true" />
    </button>)}
    {commentTarget && <><span className="chart-comment-anchor" style={composerPosition} aria-hidden="true" /><form className={`chart-comment-composer is-${commentTarget.index < 7 ? 'right' : 'left'}`} style={composerPosition} onSubmit={(event) => { event.preventDefault(); const text = commentDraft.trim(); if (!text && chartAttachments.length === 0) return; const fixedMarkerLabels = ['График добычи нефти / Мар ’25', 'Факт / Авг ’25']; if (!fixedMarkerLabels.includes(commentTarget.label)) setAddedCommentMarkers((current) => current.some((marker) => marker.label === commentTarget.label) ? current.map((marker) => marker.label === commentTarget.label ? { ...marker, count: marker.count + 1 } : marker) : [...current, { dataIndex: commentTarget.index, value: commentTarget.value, count: 1, unread: true, label: commentTarget.label }]); onAddComment(commentTarget.label, text, chartAttachments.map(({ name, size, type }) => ({ name, size, type }))); setCommentDraft(''); setChartAttachments([]); setCommentTarget(null) }}>
      <div className="chart-comment-heading"><strong>Комментарии</strong><Button className="chart-comment-close" size="xs" view="clear" onlyIcon iconLeft={IconClose} label="Отменить ввод комментария" type="button" onClick={() => { setCommentTarget(null); setCommentDraft(''); setChartAttachments([]) }} /></div>
      <label className="visually-hidden" htmlFor="chart-comment-message">Текст комментария</label>
      <textarea id="chart-comment-message" rows={3} autoFocus placeholder="Введите текст комментария" value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} />
      {chartAttachments.length > 0 && <ul className="chart-comment-attachments" aria-label="Прикреплённые файлы">{chartAttachments.map((file, index) => <li key={`${file.name}-${file.size}-${file.lastModified}`}><span title={file.name}>{file.name}</span><Button size="xs" view="clear" onlyIcon iconLeft={IconClose} label={`Удалить файл ${file.name}`} type="button" onClick={() => setChartAttachments((current) => current.filter((_, fileIndex) => fileIndex !== index))} /></li>)}</ul>}
      <div className="chart-comment-actions">
        <Button className="chart-comment-attach" size="xs" view="clear" onlyIcon iconLeft={IconAttach} label="Прикрепить файл" type="button" onClick={() => chartFileInputRef.current?.click()} />
        <input ref={chartFileInputRef} className="visually-hidden" type="file" multiple onChange={(event) => { const files = Array.from(event.target.files ?? []); setChartAttachments((current) => [...current, ...files]); event.target.value = '' }} />
        <Button size="xs" label="Отправить" type="submit" disabled={!commentDraft.trim() && chartAttachments.length === 0} />
      </div>
    </form></>}
  </div>
}

function VisualAssistant({ commentsOpen, commentCount, showCommentMarkers, selectedCommentContext, highlightedCommentContext, onToggleComments, onToggleCommentMarkers, onShowObjectInfo, activeTab, onTabChange, onOpenObjectComments, onAddChartComment }: { commentsOpen: boolean; commentCount: number; showCommentMarkers: boolean; selectedCommentContext: string | null; highlightedCommentContext: string | null; onToggleComments: () => void; onToggleCommentMarkers: () => void; onShowObjectInfo: () => void; activeTab: { label: string }; onTabChange: (tab: { label: string }) => void; onOpenObjectComments: (context: string) => void; onAddChartComment: (context: string, text: string, attachments: Attachment[]) => void }) {
  const [commentModeActive, setCommentModeActive] = useState(false)

  return <section className={`assistant-page${commentModeActive ? ' is-comment-mode' : ''}`} aria-labelledby="assistant-title">
    <h1 id="assistant-title" className="visually-hidden" tabIndex={-1}>Визуальный ассистент</h1>
    <div className="assistant-controls">
      <div className="assistant-mini-tools" aria-label="Инструменты визуального ассистента">
        {assistantTools.map((tool, index) => {
          const isInfoToggle = index === 0
          const isCommentsToggle = index === 1
          const isAddCommentToggle = index === 2
          const isVisibilityToggle = index === 3
          const isActive = isInfoToggle ? selectedCommentContext !== null && !commentsOpen : isCommentsToggle ? commentsOpen : isAddCommentToggle ? commentModeActive : isVisibilityToggle && showCommentMarkers
          const handleClick = isInfoToggle ? onShowObjectInfo : isCommentsToggle ? onToggleComments : isAddCommentToggle ? () => setCommentModeActive((value) => !value) : isVisibilityToggle ? onToggleCommentMarkers : undefined
          return <ToolbarButton key={tool.label} size="xs" view={isActive ? 'primary' : 'ghost'} onlyIcon iconLeft={tool.icon} label={tool.label} tooltipProps={{ tooltipContent: tool.label }} aria-pressed={isInfoToggle || isCommentsToggle || isAddCommentToggle || isVisibilityToggle ? isActive : undefined} aria-expanded={isInfoToggle ? selectedCommentContext !== null && !commentsOpen : isCommentsToggle ? commentsOpen : undefined} aria-controls={isInfoToggle ? 'assistant-object-panel' : isCommentsToggle ? 'page-comments-panel' : undefined} onClick={handleClick} />
        })}
      </div>
      <Tabs className="assistant-tabs" size="xs" view="bordered" items={assistantTabs} value={activeTab} onChange={onTabChange} />
    </div>
    <article className="assistant-chart-card">
      <a href="#assistant-chart" className="assistant-chart-title">Добыча нефти</a>
      <div id="assistant-chart" className="assistant-chart-body">
        <div className="assistant-year-total"><strong>35 345</strong><span>35 000</span><div><i>25 758</i></div><small>2025</small></div>
        <AssistantEChart showCommentMarkers={showCommentMarkers} commentModeActive={commentModeActive} commentCount={commentCount} highlightedCommentContext={highlightedCommentContext} onOpenComments={onOpenObjectComments} onAddComment={onAddChartComment} />
      </div>
    </article>
  </section>
}

function App() {
  const [selectedWell, setSelectedWell] = useState<number | null>(20)
  const [section, setSection] = useState(sections[0])
  const [assistantTab, setAssistantTab] = useState(assistantTabs[0])
  const [assistantCommentContext, setAssistantCommentContext] = useState<string | null>(null)
  const [assistantHighlightedContext, setAssistantHighlightedContext] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<number | null>(0)
  const [activeCommentTool, setActiveCommentTool] = useState<number | null>(null)
  const [pageCommentsOpen, setPageCommentsOpen] = useState(false)
  const [pageComments, setPageComments] = useState<PageComment[]>(initialPageComments)
  const [showCommentMarkers, setShowCommentMarkers] = useState(true)
  const [activeTab, setActiveTab] = useState('Информация')
  const [message, setMessage] = useState('')
  const [threadComments, setThreadComments] = useState<Comment[]>(initialComments)
  const [chartCommentsByContext, setChartCommentsByContext] = useState<Record<string, Comment[]>>({})
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [announcement, setAnnouncement] = useState('')
  const [activatingWell, setActivatingWell] = useState<number | null>(null)
  const [unreadWellIds, setUnreadWellIds] = useState<Set<number>>(() => new Set([12, 20]))
  const [expandedReplyThreads, setExpandedReplyThreads] = useState<Set<string>>(() => new Set(['thread-1']))
  const [menuCommentIndex, setMenuCommentIndex] = useState<number | null>(null)
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [editingAttachments, setEditingAttachments] = useState<File[]>([])
  const [replyingCommentIndex, setReplyingCommentIndex] = useState<number | null>(null)
  const [threadReplyText, setThreadReplyText] = useState('')
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null)
  const [menuPageCommentId, setMenuPageCommentId] = useState<string | null>(null)
  const [pageInlineAction, setPageInlineAction] = useState<{ id: string; mode: 'edit' | 'reply' } | null>(null)
  const [pageInlineDraft, setPageInlineDraft] = useState('')
  const activationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const editFileInputRef = useRef<HTMLInputElement | null>(null)
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const previewUrls = useRef<Set<string>>(new Set())
  const commentMenuAnchorRef = useRef<HTMLElement>(null)
  const pageCommentMenuAnchorRef = useRef<HTMLElement>(null)
  const selected = wells.find((well) => well.id === selectedWell) ?? null
  const hasScopedChartThread = section.id === 'visual-assistant' && assistantCommentContext !== null && Object.hasOwn(chartCommentsByContext, assistantCommentContext)
  const currentThreadComments = hasScopedChartThread && assistantCommentContext ? chartCommentsByContext[assistantCommentContext] : threadComments
  const updateCurrentThreadComments = (updater: (current: Comment[]) => Comment[]) => {
    if (hasScopedChartThread && assistantCommentContext) {
      setChartCommentsByContext((current) => ({ ...current, [assistantCommentContext]: updater(current[assistantCommentContext] ?? []) }))
    } else {
      setThreadComments(updater)
    }
  }
  const sidebarTabs = selected ? [
    { label: 'Информация' },
    { label: 'Текущий режим' },
    { label: 'Комментарии', rightSide: <b>{threadComments.length}</b> },
  ] : []

  useEffect(() => () => {
    if (activationTimer.current) clearTimeout(activationTimer.current)
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  useEffect(() => {
    if (!sections.some((item) => item.id === section.id)) setSection(sections[0])
  }, [section])

  const selectWell = (wellId: number) => {
    if (activationTimer.current) clearTimeout(activationTimer.current)
    setPageCommentsOpen(false)
    if (wellId === selectedWell) {
      closeObjectPanel()
      setActivatingWell(null)
      return
    }
    setSelectedWell(wellId)
    setActiveTool(0)
    setActiveTab('Информация')
    setActivatingWell(wellId)
    activationTimer.current = setTimeout(() => setActivatingWell(null), 380)
  }

  const openComments = (wellId: number) => {
    if (activationTimer.current) clearTimeout(activationTimer.current)
    setPageCommentsOpen(false)
    setHighlightedCommentId(null)
    setSelectedWell(wellId)
    setActiveTool(0)
    setActiveTab('Комментарии')
    setUnreadWellIds((current) => {
      const next = new Set(current)
      next.delete(wellId)
      return next
    })
    setActivatingWell(wellId)
    activationTimer.current = setTimeout(() => setActivatingWell(null), 380)
  }

  const closeObjectPanel = () => {
    setSelectedWell(null)
    setActiveTool((current) => current === 0 ? null : current)
  }

  const closePageComments = () => {
    setPageCommentsOpen(false)
    setActiveTool((current) => current === 4 ? selectedWell !== null ? 0 : null : current)
  }

  const selectPrimaryTool = (index: number) => {
    if (index === 4) {
      const willOpen = !pageCommentsOpen
      setPageCommentsOpen(willOpen)
      setActiveTool(willOpen ? 4 : selectedWell !== null ? 0 : null)
      return
    }
    setPageCommentsOpen(false)
    setActiveTool(index)
  }

  const openPageCommentMenu = (comment: PageComment, anchor: HTMLElement) => {
    pageCommentMenuAnchorRef.current = anchor
    setMenuPageCommentId((current) => current === comment.id ? null : comment.id)
  }

  const showPageCommentInObject = (comment: PageComment, action: 'open' | 'edit' | 'reply') => {
    if (action === 'open') setShowCommentMarkers(true)
    const parent = comment.parentId ? pageComments.find((item) => item.id === comment.parentId) : null
    const hasReplies = pageComments.some((item) => item.parentId === comment.id)
    const objectComment: Comment = { id: comment.id, parentId: comment.parentId, initials: comment.initials, author: comment.author, time: comment.time, text: comment.text, root: hasReplies, reply: Boolean(comment.parentId) }
    setThreadComments((current) => {
      const withoutOpenedThread = current.filter((item) => item.id !== comment.id && item.id !== parent?.id)
      if (!parent) return [objectComment, ...withoutOpenedThread]
      const parentComment: Comment = { id: parent.id, initials: parent.initials, author: parent.author, time: parent.time, text: parent.text, root: true }
      return [parentComment, objectComment, ...withoutOpenedThread]
    })
    if (parent) setExpandedReplyThreads((current) => new Set(current).add(parent.id))
    if (section.id === 'visual-assistant' && action === 'open') {
      const numericId = Number(comment.id.match(/\d+/)?.[0] ?? 1)
      const context = assistantCommentContexts[(numericId - 1) % assistantCommentContexts.length]
      const contextLabel = `${context.line} / ${context.period}`
      setAssistantCommentContext(contextLabel)
      setAssistantHighlightedContext(contextLabel)
      setPageCommentsOpen(false)
      setHighlightedCommentId(comment.id)
      return
    }
    setSelectedWell(comment.wellId)
    setPageCommentsOpen(false)
    setActiveTool(0)
    setActiveTab('Комментарии')
    setHighlightedCommentId(comment.id)
    setUnreadWellIds((current) => {
      const next = new Set(current)
      next.delete(comment.wellId)
      return next
    })
    if (action === 'edit') {
      setEditingCommentIndex(0)
      setEditingCommentText(comment.text)
      setEditingAttachments([])
    } else {
      setEditingCommentIndex(null)
      if (action === 'reply') {
        setMessage(`@${comment.author}, `)
        setTimeout(() => composerTextareaRef.current?.focus(), 0)
      }
    }
  }

  const handlePageCommentMenuAction = (action: (typeof pageCommentMenuItems)[number]) => {
    const comment = pageComments.find((item) => item.id === menuPageCommentId)
    if (!comment) return
    if (comment.reply && action.key === 'reply') return
    if (action.key === 'delete') {
      setPageComments((current) => current.filter((item) => item.id !== comment.id))
      setThreadComments((current) => current.filter((item) => item.id !== comment.id))
      setAnnouncement('Комментарий удалён')
    } else if (action.key === 'open') {
      showPageCommentInObject(comment, 'open')
    } else {
      const mode = action.key as 'edit' | 'reply'
      setPageInlineAction({ id: comment.id, mode })
      setPageInlineDraft(mode === 'edit' ? comment.text : '')
    }
    setMenuPageCommentId(null)
  }

  const submitPageInlineAction = (event: FormEvent<HTMLFormElement>, comment: PageComment) => {
    event.preventDefault()
    const text = pageInlineDraft.trim()
    if (!text || !pageInlineAction) return
    if (pageInlineAction.mode === 'edit') {
      setPageComments((current) => current.map((item) => item.id === comment.id ? { ...item, text } : item))
      setThreadComments((current) => current.map((item) => item.id === comment.id ? { ...item, text } : item))
      setAnnouncement('Комментарий изменён')
    } else {
      const now = new Date()
      const reply: PageComment = {
        id: `reply-${Date.now()}`,
        wellId: comment.wellId,
        initials: 'МТ',
        author: 'Вы, пользователь СППР',
        path: comment.path,
        time: `${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ${now.toLocaleDateString('ru-RU')}`,
        text,
        reply: true,
        parentId: comment.id,
        replyTo: comment.author,
        replyToText: comment.text,
      }
      setPageComments((current) => {
        const parentIndex = current.findIndex((item) => item.id === comment.id)
        return parentIndex < 0 ? [...current, reply] : [...current.slice(0, parentIndex + 1), reply, ...current.slice(parentIndex + 1)]
      })
      const parentThreadComment: Comment = { id: comment.id, initials: comment.initials, author: comment.author, time: comment.time, text: comment.text, root: true }
      const threadReply: Comment = { id: reply.id, parentId: comment.id, initials: reply.initials, author: reply.author, time: reply.time, text: reply.text, reply: true }
      setThreadComments((current) => {
        const next = current.filter((item) => item.id !== reply.id)
        const parentIndex = next.findIndex((item) => item.id === comment.id)
        if (parentIndex < 0) return [parentThreadComment, threadReply, ...next]
        next[parentIndex] = { ...next[parentIndex], root: true }
        let insertIndex = parentIndex + 1
        while (insertIndex < next.length && next[insertIndex].reply) insertIndex += 1
        return [...next.slice(0, insertIndex), threadReply, ...next.slice(insertIndex)]
      })
      setExpandedReplyThreads((current) => new Set(current).add(comment.id))
      setAnnouncement('Ответ добавлен')
    }
    setPageInlineAction(null)
    setPageInlineDraft('')
  }

  const renderPageComment = (comment: PageComment) => <PageCommentItem
    key={comment.id}
    comment={comment}
    mode={pageInlineAction?.id === comment.id ? pageInlineAction.mode : null}
    draft={pageInlineAction?.id === comment.id ? pageInlineDraft : ''}
    onDraftChange={setPageInlineDraft}
    onSubmit={(event) => submitPageInlineAction(event, comment)}
    onCancel={() => { setPageInlineAction(null); setPageInlineDraft('') }}
    onMenu={openPageCommentMenu}
  />

  const selectTab = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'Комментарии' && selectedWell !== null) {
      setUnreadWellIds((current) => {
        const next = new Set(current)
        next.delete(selectedWell)
        return next
      })
    }
  }

  const addAttachments = (files: FileList | null) => {
    if (!files?.length) return
    const selectedFiles = Array.from(files)
    setAttachments((current) => {
      const existing = new Set(current.map(({ file }) => `${file.name}:${file.size}:${file.lastModified}`))
      const added = selectedFiles.filter((file) => !existing.has(`${file.name}:${file.size}:${file.lastModified}`)).map((file) => {
        if (!file.type.startsWith('image/')) return { file }
        const previewUrl = URL.createObjectURL(file)
        previewUrls.current.add(previewUrl)
        return { file, previewUrl }
      })
      return [...current, ...added]
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments((current) => {
      const removed = current[index]
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl)
        previewUrls.current.delete(removed.previewUrl)
      }
      return current.filter((_, fileIndex) => fileIndex !== index)
    })
  }

  const submitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if ((!message.trim() && attachments.length === 0) || (selectedWell === null && assistantCommentContext === null)) return
    const now = new Date()
    const time = `${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ${now.toLocaleDateString('ru-RU')}`
    updateCurrentThreadComments((current) => [{
      initials: 'МТ',
      author: 'Вы, пользователь СППР',
      time,
      text: message.trim(),
      attachments: attachments.map(({ file: { name, size, type } }) => ({ name, size, type })),
    }, ...current])
    setMessage('')
    attachments.forEach(({ previewUrl }) => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        previewUrls.current.delete(previewUrl)
      }
    })
    setAttachments([])
    setAnnouncement('Комментарий добавлен')
  }

  const openCommentMenu = (index: number, anchor: HTMLElement) => {
    commentMenuAnchorRef.current = anchor
    setMenuCommentIndex((current) => current === index ? null : index)
  }

  const handleCommentMenuAction = (action: (typeof commentMenuItems)[number]) => {
    if (menuCommentIndex === null) return
    if (action.key === 'delete') {
      updateCurrentThreadComments((current) => current.filter((_, index) => index !== menuCommentIndex))
      if (selectedWell !== null) {
      }
      setAnnouncement('Комментарий удалён')
    } else {
      setEditingCommentIndex(menuCommentIndex)
      setEditingCommentText(currentThreadComments[menuCommentIndex]?.text ?? '')
      setEditingAttachments([])
    }
    setMenuCommentIndex(null)
  }

  const saveEditedComment = () => {
    if (editingCommentIndex === null || !editingCommentText.trim()) return
    const editedCommentId = currentThreadComments[editingCommentIndex]?.id
    updateCurrentThreadComments((current) => current.map((comment, index) => index === editingCommentIndex ? {
      ...comment,
      text: editingCommentText.trim(),
      attachments: [...(comment.attachments ?? []), ...editingAttachments.map(({ name, size, type }) => ({ name, size, type }))],
    } : comment))
    if (editedCommentId) {
      setPageComments((current) => current.map((comment) => comment.id === editedCommentId ? { ...comment, text: editingCommentText.trim() } : comment))
    }
    setEditingCommentIndex(null)
    setEditingCommentText('')
    setEditingAttachments([])
    setAnnouncement('Комментарий изменён')
  }

  const addEditingAttachments = (files: FileList | null) => {
    if (!files?.length) return
    const selectedFiles = Array.from(files)
    setEditingAttachments((current) => {
      const existing = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`))
      return [...current, ...selectedFiles.filter((file) => !existing.has(`${file.name}:${file.size}:${file.lastModified}`))]
    })
    if (editFileInputRef.current) editFileInputRef.current.value = ''
  }

  const submitThreadReply = (event: FormEvent<HTMLFormElement>, parentIndex: number) => {
    event.preventDefault()
    const text = threadReplyText.trim()
    if (!text) return
    const now = new Date()
    const reply: Comment = {
      id: `thread-reply-${Date.now()}`,
      initials: 'МТ',
      author: 'Вы, пользователь СППР',
      time: `${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ${now.toLocaleDateString('ru-RU')}`,
      text,
      reply: true,
      parentId: currentThreadComments[parentIndex]?.id,
    }
    updateCurrentThreadComments((current) => [...current.slice(0, parentIndex + 1), reply, ...current.slice(parentIndex + 1)])
    const parentId = currentThreadComments[parentIndex]?.id
    if (parentId) setExpandedReplyThreads((current) => new Set(current).add(parentId))
    setReplyingCommentIndex(null)
    setThreadReplyText('')
    setAnnouncement('Ответ добавлен')
  }

  const withCurrentCommentContext = (comment: PageComment) => {
    if (section.id !== 'visual-assistant') return comment
    const numericId = Number(comment.id.match(/\d+/)?.[0] ?? 1)
    const context = assistantCommentContexts[(numericId - 1) % assistantCommentContexts.length]
    return { ...comment, path: `${assistantTab.label} / Добыча нефти / ${context.line} / ${context.period}` }
  }

  const pageCommentsPanel = pageCommentsOpen && <aside id="page-comments-panel" className="object-card page-comments-card" aria-label="Все комментарии на странице">
    <div className="card-heading page-comments-heading"><Text as="h2" weight="semibold" size="xs">Комментарии</Text><Button className="sidebar-icon-button" size="xs" view="clear" onlyIcon iconLeft={IconClose} label="Закрыть комментарии" onClick={closePageComments} /></div>
    <div className="page-comments-list">
      {pageComments.some((comment) => comment.unread) && <section aria-labelledby="unread-comments-title">
        <div className="comment-group-heading"><Text id="unread-comments-title" size="xs" view="secondary" fontStyle="italic">Не прочитано</Text><Button size="xs" view="clear" label="Прочитать всё" onClick={() => setPageComments((current) => current.map((comment) => ({ ...comment, unread: false })))} /></div>
        <div className="page-comment-items">{pageComments.filter((comment) => comment.unread).map((comment) => renderPageComment(withCurrentCommentContext(comment)))}</div>
      </section>}
      <section aria-labelledby="read-comments-title">
        <div className="comment-group-heading"><Text id="read-comments-title" size="xs" view="secondary" fontStyle="italic">Прочитано</Text></div>
        <div className="page-comment-items">{pageComments.filter((comment) => !comment.unread).map((comment) => renderPageComment(withCurrentCommentContext(comment)))}</div>
      </section>
    </div>
    <ContextMenu className="comment-context-menu" size="s" items={pageComments.find((comment) => comment.id === menuPageCommentId)?.reply ? pageReplyMenuItems : pageCommentMenuItems} isOpen={menuPageCommentId !== null} anchorRef={pageCommentMenuAnchorRef as RefObject<HTMLElement>} direction="rightStartUp" spareDirection="leftStartUp" onItemClick={handlePageCommentMenuAction} onClickOutside={() => setMenuPageCommentId(null)} onEsc={() => setMenuPageCommentId(null)} />
  </aside>

  const assistantObjectPanel = section.id === 'visual-assistant' && assistantCommentContext && !pageCommentsOpen && <aside id="assistant-object-panel" className="object-card assistant-object-card" aria-label={`Информация по объекту: Добыча нефти / ${assistantCommentContext}`}>
    <div className="card-heading"><Text weight="semibold" size="xs">Информация по объекту</Text><Button className="sidebar-icon-button" size="xs" view="clear" onlyIcon iconLeft={IconClose} label="Закрыть" onClick={() => { setAssistantCommentContext(null); setAssistantHighlightedContext(null) }} /></div>
    <Text as="h1" size="m">Добыча нефти / {assistantCommentContext}</Text>
    <Button size="xs" view="ghost" width="full" label="Открыть Цифровой Двойник  ↗" />
    <Tabs className="sidebar-tabs" size="xs" view="bordered" items={[{ label: 'Комментарии', rightSide: <b>{currentThreadComments.length}</b> }]} value={{ label: 'Комментарии', rightSide: <b>{currentThreadComments.length}</b> }} onChange={() => undefined} />
    <form className="comment-form" action="#" method="post" onSubmit={submitComment}>
      <label className="visually-hidden" htmlFor="assistant-comment-message">Текст комментария</label>
      <div className="composer">
        <textarea ref={composerTextareaRef} id="assistant-comment-message" name="message" placeholder="Введите текст сообщения" value={message} onChange={(event) => setMessage(event.target.value)} />
        {attachments.length > 0 && <ul className="attachment-list" aria-label="Выбранные файлы">
          {attachments.map(({ file, previewUrl }, index) => <li className={previewUrl ? 'image-attachment' : 'file-attachment'} key={`${file.name}-${file.size}-${file.lastModified}`}>
            {previewUrl ? <img src={previewUrl} alt="" /> : <><span className="file-icon" aria-hidden="true">⌕</span><span className="file-details"><strong>{file.name}</strong><small>{formatFileSize(file.size)}</small></span></>}
            <Button className="attachment-remove" size="xs" view="clear" onlyIcon iconLeft={IconClose} label={`Удалить файл ${file.name}`} onClick={() => removeAttachment(index)} />
          </li>)}
        </ul>}
        <div className="composer-toolbar">
          <Button className="attach-button" size="xs" view="clear" onlyIcon iconLeft={IconAttach} label="Прикрепить файл" onClick={() => fileInputRef.current?.click()} />
          <input ref={fileInputRef} className="visually-hidden" id="assistant-comment-files" name="attachments" type="file" multiple onChange={(event) => addAttachments(event.target.files)} />
          <Button size="xs" type="submit" disabled={!message.trim() && attachments.length === 0} label="Отправить" />
        </div>
      </div>
    </form>
    <p className="visually-hidden" aria-live="polite">{announcement}</p>
    <div className="comments assistant-object-comments">
      {currentThreadComments.map((comment, index) => {
        if (comment.reply && comment.parentId && !expandedReplyThreads.has(comment.parentId)) return null
        const isEditing = editingCommentIndex === index
        const commentId = comment.id ?? `comment-${index}`
        const branchReplyCount = currentThreadComments.filter((item) => item.reply && item.parentId === commentId).length
        const branchExpanded = expandedReplyThreads.has(commentId)
        return <article className={['comment', comment.reply ? 'is-reply' : '', comment.id === highlightedCommentId ? 'is-highlighted' : ''].filter(Boolean).join(' ')} key={comment.id ?? `${comment.time}-${index}`}>
          <span className={`avatar ${getAvatarTone(comment.initials)}`}>{comment.initials}</span>
          <div className="comment-content">
            <div className="comment-title">
              <strong>{comment.author}</strong>
              <Button className="comment-menu" size="xs" view="clear" onlyIcon iconLeft={comment.root ? IconReply : IconKebab} label={comment.root ? 'Ответить' : 'Меню комментария'} aria-expanded={comment.root ? replyingCommentIndex === index : menuCommentIndex === index} onClick={comment.root ? () => { setReplyingCommentIndex((current) => current === index ? null : index); setThreadReplyText('') } : (event) => openCommentMenu(index, event.currentTarget as HTMLElement)} />
            </div>
            <small>{assistantTab.label} / Добыча нефти / {assistantCommentContext}</small>
            <small>{comment.time}</small>
            {isEditing ? <div className="comment-edit-form">
              <TextField type="textarea" size="s" rows={3} ariaLabel="Текст комментария" value={editingCommentText} onChange={(value) => setEditingCommentText(value ?? '')} />
              {editingAttachments.length > 0 && <ul className="edit-attachment-list" aria-label="Новые вложения">
                {editingAttachments.map((file, fileIndex) => <li key={`${file.name}-${file.size}-${file.lastModified}`}><span><strong>{file.name}</strong><small>{formatFileSize(file.size)}</small></span><Button size="xs" view="clear" onlyIcon iconLeft={IconClose} label={`Удалить файл ${file.name}`} onClick={() => setEditingAttachments((current) => current.filter((_, itemIndex) => itemIndex !== fileIndex))} /></li>)}
              </ul>}
              <div className="comment-edit-toolbar">
                <Button size="xs" view="clear" onlyIcon iconLeft={IconAttach} label="Прикрепить файл" onClick={() => editFileInputRef.current?.click()} />
                <input ref={editFileInputRef} className="visually-hidden" name="assistant-edit-attachments" type="file" multiple onChange={(event) => addEditingAttachments(event.target.files)} />
                <div className="comment-edit-actions"><Button size="xs" label="Сохранить" disabled={!editingCommentText.trim()} onClick={saveEditedComment} /><Button size="xs" view="clear" label="Отмена" onClick={() => { setEditingCommentIndex(null); setEditingAttachments([]) }} /></div>
              </div>
            </div> : comment.text && <p>{comment.text}</p>}
            {comment.attachments && comment.attachments.length > 0 && <ul className="comment-attachments">{comment.attachments.map((file) => <li key={`${file.name}-${file.size}`}><span aria-hidden="true">⌕</span><span><strong>{file.name}</strong><small>{formatFileSize(file.size)}</small></span></li>)}</ul>}
            {comment.root && replyingCommentIndex === index && <form className="thread-reply-form" action="#" method="post" onSubmit={(event) => submitThreadReply(event, index)}>
              <label className="visually-hidden" htmlFor={`assistant-thread-reply-${index}`}>Текст ответа</label>
              <textarea id={`assistant-thread-reply-${index}`} name="reply" rows={3} autoFocus placeholder="Введите текст ответа" value={threadReplyText} onChange={(event) => setThreadReplyText(event.target.value)} />
              <div className="thread-reply-actions"><Button size="xs" type="submit" disabled={!threadReplyText.trim()} label="Ответить" /><Button size="xs" type="button" view="clear" label="Отмена" onClick={() => { setReplyingCommentIndex(null); setThreadReplyText('') }} /></div>
            </form>}
          </div>
          {comment.root && branchReplyCount > 0 && <Button className="reply-link" size="xs" view="clear" iconLeft={branchExpanded ? IconArrowDown : IconArrowRight} iconSize="xs" label={`Ответы (${branchReplyCount})`} aria-expanded={branchExpanded} onClick={() => setExpandedReplyThreads((current) => { const next = new Set(current); if (next.has(commentId)) next.delete(commentId); else next.add(commentId); return next })} />}
        </article>
      })}
      <ContextMenu className="comment-context-menu" size="s" items={commentMenuItems} isOpen={menuCommentIndex !== null} anchorRef={commentMenuAnchorRef as RefObject<HTMLElement>} direction="rightStartUp" spareDirection="leftStartUp" onItemClick={handleCommentMenuAction} onClickOutside={() => setMenuCommentIndex(null)} onEsc={() => setMenuCommentIndex(null)} />
    </div>
  </aside>

  return (
    <Theme preset={presetGpnDefault} className="theme-root">
      <div className="app-shell">
        <header className="topbar">
          <div className="brand-block">
            <Button className="header-menu-button" size="s" view="clear" onlyIcon iconLeft={IconHamburger} label="Открыть меню" />
            <Text size="xs" view="secondary">СППР</Text>
            <Select className="header-field header-section" dropdownClassName="header-section-dropdown" style={{ zIndex: 100 }} size="s" ariaLabel="Раздел" items={sections} value={section} onChange={(value) => value && setSection(value)} />
          </div>
        </header>

        <main id="content" className="workspace">
          {pageCommentsPanel}
          {assistantObjectPanel}
          {section.id === 'visual-assistant' ? <VisualAssistant commentsOpen={pageCommentsOpen} commentCount={threadComments.length} showCommentMarkers={showCommentMarkers} selectedCommentContext={assistantCommentContext} highlightedCommentContext={assistantHighlightedContext} onToggleComments={() => setPageCommentsOpen((value) => !value)} onToggleCommentMarkers={() => setShowCommentMarkers((value) => !value)} onShowObjectInfo={() => { if (assistantCommentContext) setPageCommentsOpen(false) }} activeTab={assistantTab} onTabChange={setAssistantTab} onOpenObjectComments={(context) => { setPageCommentsOpen(false); setHighlightedCommentId(null); setAssistantHighlightedContext(null); setAssistantCommentContext(context) }} onAddChartComment={(context, text, attachments) => { const now = new Date(); const newComment: Comment = { id: `chart-comment-${Date.now()}`, initials: 'МТ', author: 'Вы, пользователь СППР', time: `${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ${now.toLocaleDateString('ru-RU')}`, text: `${text}`, attachments, root: false }; setChartCommentsByContext((current) => ({ ...current, [context]: [newComment, ...(current[context] ?? [])] })); setPageCommentsOpen(false); setAssistantCommentContext(context); setShowCommentMarkers(true); setAnnouncement('Комментарий добавлен') }} /> : <>
          <div className="toolbars" aria-label="Инструменты схемы">
            <div className="toolbar">
              {primaryTools.map((tool, index) => (
                <ToolbarButton key={tool.label} className="tool" size="xs" view={activeTool === index ? 'primary' : 'clear'} onlyIcon iconLeft={tool.icon} label={tool.label} tooltipProps={{ tooltipContent: tool.label }} onClick={() => selectPrimaryTool(index)} aria-pressed={activeTool === index} aria-expanded={index === 4 ? pageCommentsOpen : undefined} />
              ))}
            </div>
            <div className="toolbar">
              {commentTools.map((tool, index) => {
                const isAddCommentDisabled = index === 0
                const isActive = isAddCommentDisabled ? false : index === 1 ? showCommentMarkers : activeCommentTool === index
                return <ToolbarButton key={tool.label} className="tool" size="xs" view={isActive ? 'primary' : 'clear'} onlyIcon iconLeft={tool.icon} label={tool.label} tooltipProps={{ tooltipContent: tool.label }} disabled={isAddCommentDisabled} onClick={isAddCommentDisabled ? undefined : () => index === 1 ? setShowCommentMarkers((value) => !value) : setActiveCommentTool((value) => value === index ? null : index)} aria-pressed={isAddCommentDisabled ? undefined : isActive} />
              })}
            </div>
          </div>

          {selected && !pageCommentsOpen && <aside id="object-panel" className="object-card" aria-label={'Информация: ' + selected.name}>
            <div className="card-heading"><Text weight="semibold" size="xs">Информация по объекту</Text><Button className="sidebar-icon-button" size="xs" view="clear" onlyIcon iconLeft={IconClose} label="Закрыть" onClick={closeObjectPanel} /></div>
            <div className="badges"><span>ЦИФРОВОЙ ДВОЙНИК</span><span>В РАБОТЕ</span><span>48%</span></div>
            <Text as="h1" size="m">{selected.name.replace('-', ' ')}</Text>
            <Button size="xs" view="ghost" width="full" label="Открыть Цифровой Двойник  ↗" />
            <Tabs className="sidebar-tabs" size="xs" view="bordered" items={sidebarTabs} value={sidebarTabs.find((tab) => tab.label === activeTab)} onChange={(tab) => selectTab(String(tab.label))} />
            {activeTab === 'Комментарии' ? <>
              <form className="comment-form" action="#" method="post" onSubmit={submitComment}>
                <label className="visually-hidden" htmlFor="comment-message">Текст комментария</label>
                <div className="composer">
                  <textarea ref={composerTextareaRef} id="comment-message" name="message" placeholder="Введите текст сообщения" value={message} onChange={(event) => setMessage(event.target.value)} />
                  {attachments.length > 0 && <ul className="attachment-list" aria-label="Выбранные файлы">
                    {attachments.map(({ file, previewUrl }, index) => <li className={previewUrl ? 'image-attachment' : 'file-attachment'} key={`${file.name}-${file.size}-${file.lastModified}`}>
                      {previewUrl ? <img src={previewUrl} alt="" /> : <><span className="file-icon" aria-hidden="true">⌕</span><span className="file-details"><strong>{file.name}</strong><small>{formatFileSize(file.size)}</small></span></>}
                      <Button className="attachment-remove" size="xs" view="clear" onlyIcon iconLeft={IconClose} label={`Удалить файл ${file.name}`} onClick={() => removeAttachment(index)} />
                    </li>)}
                  </ul>}
                  <div className="composer-toolbar">
                    <Button className="attach-button" size="xs" view="clear" onlyIcon iconLeft={IconAttach} label="Прикрепить файл" onClick={() => fileInputRef.current?.click()} />
                    <input ref={fileInputRef} className="visually-hidden" id="comment-files" name="attachments" type="file" multiple onChange={(event) => addAttachments(event.target.files)} />
                    <Button size="xs" type="submit" disabled={!message.trim() && attachments.length === 0} label="Отправить" />
                  </div>
                </div>
              </form>
              <p className="visually-hidden" aria-live="polite">{announcement}</p>
              <div className="comments">
                {threadComments.map((comment, index) => {
                  if (comment.reply && comment.parentId && !expandedReplyThreads.has(comment.parentId)) return null
                  const isEditing = editingCommentIndex === index
                  const commentId = comment.id ?? `comment-${index}`
                  const branchReplyCount = threadComments.filter((item) => item.reply && item.parentId === commentId).length
                  const branchExpanded = expandedReplyThreads.has(commentId)
                  return <article className={['comment', comment.reply ? 'is-reply' : '', comment.id === highlightedCommentId ? 'is-highlighted' : ''].filter(Boolean).join(' ')} key={comment.id ?? `${comment.time}-${index}`}>
                    <span className={`avatar ${getAvatarTone(comment.initials)}`}>{comment.initials}</span>
                    <div className="comment-content">
                      <div className="comment-title">
                        <strong>{comment.author}</strong>
                        <Button className="comment-menu" size="xs" view="clear" onlyIcon iconLeft={comment.root ? IconReply : IconKebab} label={comment.root ? 'Ответить' : 'Меню комментария'} aria-expanded={comment.root ? replyingCommentIndex === index : menuCommentIndex === index} onClick={comment.root ? () => { setReplyingCommentIndex((current) => current === index ? null : index); setThreadReplyText('') } : (event) => openCommentMenu(index, event.currentTarget as HTMLElement)} />
                      </div>
                      <small>Ключевые показатели / Добыча нефти / Ноя '25</small>
                      <small>{comment.time}</small>
                      {isEditing ? <div className="comment-edit-form">
                        <TextField type="textarea" size="s" rows={3} ariaLabel="Текст комментария" value={editingCommentText} onChange={(value) => setEditingCommentText(value ?? '')} />
                        {editingAttachments.length > 0 && <ul className="edit-attachment-list" aria-label="Новые вложения">
                          {editingAttachments.map((file, fileIndex) => <li key={`${file.name}-${file.size}-${file.lastModified}`}><span><strong>{file.name}</strong><small>{formatFileSize(file.size)}</small></span><Button size="xs" view="clear" onlyIcon iconLeft={IconClose} label={`Удалить файл ${file.name}`} onClick={() => setEditingAttachments((current) => current.filter((_, index) => index !== fileIndex))} /></li>)}
                        </ul>}
                        <div className="comment-edit-toolbar">
                          <Button size="xs" view="clear" onlyIcon iconLeft={IconAttach} label="Прикрепить файл" onClick={() => editFileInputRef.current?.click()} />
                          <input ref={editFileInputRef} className="visually-hidden" name="edit-attachments" type="file" multiple onChange={(event) => addEditingAttachments(event.target.files)} />
                          <div className="comment-edit-actions"><Button size="xs" label="Сохранить" disabled={!editingCommentText.trim()} onClick={saveEditedComment} /><Button size="xs" view="clear" label="Отмена" onClick={() => { setEditingCommentIndex(null); setEditingAttachments([]) }} /></div>
                        </div>
                      </div> : comment.text && <p>{comment.text}</p>}
                      {comment.attachments && comment.attachments.length > 0 && <ul className="comment-attachments">{comment.attachments.map((file) => <li key={`${file.name}-${file.size}`}><span aria-hidden="true">⌕</span><span><strong>{file.name}</strong><small>{formatFileSize(file.size)}</small></span></li>)}</ul>}
                      {comment.root && replyingCommentIndex === index && <form className="thread-reply-form" action="#" method="post" onSubmit={(event) => submitThreadReply(event, index)}>
                        <label className="visually-hidden" htmlFor={`thread-reply-${index}`}>Текст ответа</label>
                        <textarea id={`thread-reply-${index}`} name="reply" rows={3} autoFocus placeholder="Введите текст ответа" value={threadReplyText} onChange={(event) => setThreadReplyText(event.target.value)} />
                        <div className="thread-reply-actions"><Button size="xs" type="submit" disabled={!threadReplyText.trim()} label="Ответить" /><Button size="xs" type="button" view="clear" label="Отмена" onClick={() => { setReplyingCommentIndex(null); setThreadReplyText('') }} /></div>
                      </form>}
                    </div>
                    {comment.root && branchReplyCount > 0 && <Button className="reply-link" size="xs" view="clear" iconLeft={branchExpanded ? IconArrowDown : IconArrowRight} iconSize="xs" label={`Ответы (${branchReplyCount})`} aria-expanded={branchExpanded} onClick={() => setExpandedReplyThreads((current) => { const next = new Set(current); if (next.has(commentId)) next.delete(commentId); else next.add(commentId); return next })} />}
                  </article>
                })}
                <ContextMenu className="comment-context-menu" size="s" items={commentMenuItems} isOpen={menuCommentIndex !== null} anchorRef={commentMenuAnchorRef as RefObject<HTMLElement>} direction="rightStartUp" spareDirection="leftStartUp" onItemClick={handleCommentMenuAction} onClickOutside={() => setMenuCommentIndex(null)} onEsc={() => setMenuCommentIndex(null)} />
              </div>
            </> : <div className="empty-tab"><Text size="s" view="secondary">Данные раздела для {selected.name}</Text></div>}
          </aside>}

          <section className={`scheme${activeCommentTool === 0 ? ' is-comment-mode' : ''}`} aria-label="Схема скважин">
            {wells.map((well) => {
              const isSelected = selectedWell === well.id
              const hasUnread = unreadWellIds.has(well.id)
              const icon = isSelected ? '/assets/well-active.svg' : well.status === 'alert' ? '/assets/well-alert.svg' : '/assets/well-ok.svg'
              const className = ['well', isSelected ? 'selected' : 'inactive-pin', activatingWell === well.id ? 'pin-activating' : ''].filter(Boolean).join(' ')
              return <div key={well.id} className={className} style={{ '--x': well.x + '%', '--y': well.y + '%' } as CSSProperties}>
                {showCommentMarkers && <button className={'comment-marker ' + (hasUnread ? 'has-unread' : 'is-read')} onClick={() => openComments(well.id)} aria-label={`${well.name}: ${threadComments.length} комментариев${hasUnread ? ', есть новые' : ', все прочитаны'}`} aria-pressed={isSelected}>
                  <CommentGlyph />
                  <span>{formatCommentCount(threadComments.length)}</span>
                  <i className="unread-indicator" aria-hidden="true" />
                </button>}
                <button className="well-target" onClick={() => selectWell(well.id)} aria-label={well.name} aria-pressed={isSelected}>
                  <img className="well-icon pin-head" src={icon} alt="" aria-hidden="true" />
                  <span className="well-label">{well.name}</span>
                </button>
              </div>
            })}
          </section>
          </>}
        </main>
      </div>
    </Theme>
  )
}

export default App
