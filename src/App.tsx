import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent, type ReactNode, type RefObject } from 'react'
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
import { IconCalendar } from '@consta/icons/IconCalendar'
import { IconClose } from '@consta/icons/IconClose'
import { IconDownload } from '@consta/icons/IconDownload'
import { IconEdit } from '@consta/icons/IconEdit'
import { IconHamburger } from '@consta/icons/IconHamburger'
import { IconKebab } from '@consta/icons/IconKebab'
import { IconReply } from '@consta/icons/IconReply'
import { IconSendMessage } from '@consta/icons/IconSendMessage'
import { IconTrash } from '@consta/icons/IconTrash'
import { IconUser } from '@consta/icons/IconUser'
import type { IconComponent } from '@consta/icons/Icon'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import './App.css'

echarts.use([BarChart, LineChart, AriaComponent, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

type Well = { id: number; name: string; x: number; y: number; status: 'alert' | 'ok' | 'active'; icon: string; comments: number }
type Attachment = { name: string; size: number; type: string; previewUrl?: string }
type PendingAttachment = { file: File; previewUrl?: string }
type TaskStatus = 'Новое' | 'В работе' | 'Закрыто'
type CommentSort = 'newest' | 'oldest'
type CommentFilter = 'all' | 'tasks' | 'myTasks'
type PageCommentFilter = 'comments' | 'tasks'
type PageTaskFilter = 'all' | 'mine' | 'active' | 'closed'
type Comment = { id?: string; parentId?: string; initials: string; author: string; time: string; text: string; root?: boolean; reply?: boolean; recipient?: string; task?: { assignee: string; status: TaskStatus; statusTime?: string }; attachments?: Attachment[] }
type PageComment = Comment & { id: string; wellId: number; path: string; unread?: boolean; parentId?: string; replyTo?: string; replyToText?: string }

const wells: Well[] = [
  { id: 12, name: 'Скважина-12', x: 47, y: 49, status: 'alert', icon: '/assets/well-alert.svg', comments: 3 },
  { id: 20, name: 'Скважина-20', x: 54, y: 51, status: 'active', icon: '/assets/well-active.svg', comments: 12 },
  { id: 11, name: 'Скважина-11', x: 63, y: 54, status: 'ok', icon: '/assets/well-ok.svg', comments: 1 },
]

const getWellPath = (wellId: number) => `Месторождение1 / Куст1 / ${wells.find((well) => well.id === wellId)?.name ?? `Скважина-${wellId}`}`

const makeToolbarIcon = (src: string) => (({ className }: { className?: string }) => (
  <span className={`tool-icon ${className ?? ''}`} style={{ '--tool-icon': `url(${src})` } as CSSProperties} />
)) as unknown as IconComponent

const ToolbarButton = withTooltip({ className: 'toolbar-tooltip', direction: 'downCenter', spareDirection: 'upCenter', size: 'xs', appearTimeout: 300, exitTimeout: 100 })(Button)

const IconObjectMap = makeToolbarIcon('/assets/IconObjectMap.svg')
const IconObjectOpen = makeToolbarIcon('/assets/IconObjectOpen.svg')

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

type SectionItem = { id: 'digital' | 'variant-2' | 'visual-assistant'; label: string; disabled?: boolean }

const sections: SectionItem[] = [
  { id: 'digital', label: 'Вариант 1' },
  { id: 'variant-2', label: 'Вариант 2' },
  { id: 'visual-assistant', label: 'Визуальный ассистент', disabled: true },
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
const currentUserAssignee = 'Вы, пользователь СППР'
const commentRecipients = [currentUserAssignee, 'Иванов И. И.', 'Соколова Л. Д.', 'Петров А. П.', 'Кузнецова Н. В.', 'Морозов Р. С.']
const recipientMenuItems = commentRecipients.map((label) => ({ key: label, label }))
const taskStatusItems = (['Новое', 'В работе', 'Закрыто'] as TaskStatus[]).map((label) => ({ key: label, label }))
const commentFilterItems: { key: CommentFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'tasks', label: 'Задания' },
  { key: 'myTasks', label: 'Мои задания' },
]
const pageCommentFilterItems: { key: PageCommentFilter; label: string }[] = [
  { key: 'comments', label: 'Комментарии' },
  { key: 'tasks', label: 'Задания' },
]
const pageTaskFilterItems: { key: PageTaskFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'mine', label: 'Мои задания' },
  { key: 'active', label: 'Активные' },
  { key: 'closed', label: 'Завершённые' },
]
const getPersonInitials = (name: string) => {
  const [lastName = '', firstInitial = ''] = name.replace(/,/g, '').split(/\s+/)
  return `${lastName[0] ?? ''}${firstInitial[0] ?? ''}`.toUpperCase()
}
const getCommentTimestamp = (time: string) => {
  const match = time.match(/(\d{2}):(\d{2}) (\d{2})\.(\d{2})\.(\d{4})/)
  if (!match) return 0
  const [, hours, minutes, day, month, year] = match
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes)).getTime()
}
const getSortedCommentEntries = (comments: Comment[], sort: CommentSort) => {
  const entries = comments.map((comment, index) => ({ comment, index }))
  const repliesByParent = new Map<string, typeof entries>()
  entries.forEach((entry) => {
    if (!entry.comment.reply || !entry.comment.parentId) return
    const replies = repliesByParent.get(entry.comment.parentId) ?? []
    replies.push(entry)
    repliesByParent.set(entry.comment.parentId, replies)
  })
  const direction = sort === 'newest' ? -1 : 1
  const compare = (a: (typeof entries)[number], b: (typeof entries)[number]) => (getCommentTimestamp(a.comment.time) - getCommentTimestamp(b.comment.time)) * direction
  return entries
    .filter((entry) => !entry.comment.reply || !entry.comment.parentId || !comments.some((comment) => comment.id === entry.comment.parentId))
    .sort(compare)
    .flatMap((entry) => [entry, ...(repliesByParent.get(entry.comment.id ?? '') ?? []).sort((a, b) => getCommentTimestamp(a.comment.time) - getCommentTimestamp(b.comment.time))])
}
const initialComments: Comment[] = [
  { id: 'thread-1', initials: 'ИД', author: 'Иванов И. И., начальник цеха добычи', time: '17:16 15.12.2024', text: 'По скважине зафиксировано снижение дебита на 8%. Прошу проверить режим работы насоса и актуальность замера.', root: true },
  { id: 'thread-2', parentId: 'thread-1', initials: 'СЛ', author: 'Соколова Л. Д., ведущий технолог', time: '20:16 15.12.2024', text: 'Замер подтверждён. Давление на приёме ЭЦН ниже расчётного, запланировали диагностику на утреннюю смену.', reply: true },
  { id: 'thread-3', initials: 'АП', author: 'Петров А. П., главный геолог', time: '10:24 16.12.2024', text: 'По геологической модели приток стабилен. Рекомендую сначала исключить влияние наземного оборудования.' },
  { id: 'thread-4', initials: 'КН', author: 'Кузнецова Н. В., инженер по добыче', time: '11:08 16.12.2024', text: 'Проверила телеметрию: скачков температуры и вибрации за последние сутки не было.' },
  { id: 'thread-5', initials: 'МР', author: 'Морозов Р. С., диспетчер промысла', time: '12:31 16.12.2024', text: 'Заявка №4821 создана, выезд бригады назначен на 08:30.' },
  { id: 'thread-6', initials: 'ЕА', author: 'Егорова А. М., специалист ППД', time: '14:05 16.12.2024', text: 'Приёмистость ближайшей нагнетательной скважины без отклонений. Влияние системы ППД маловероятно.' },
  { id: 'thread-7', initials: 'МТ', author: 'Вы, пользователь СППР', time: '13:22 26.08.2026', text: 'Проверить актуальность последнего замера и приложить результат диагностики.', task: { assignee: 'Соколова Л. Д.', status: 'В работе', statusTime: '13:22 26.08.2026' } },
  { id: 'thread-status-step-7-demo', parentId: 'thread-7', initials: 'СЛ', author: 'Соколова Л. Д., ведущий технолог', time: '14:05 26.08.2026', text: 'Статус изменён на «В работе». Задание принято в работу, диагностика запланирована на текущую смену.', reply: true },
  { id: 'thread-8', initials: 'МТ', author: 'Вы, пользователь СППР', time: '13:35 26.08.2026', text: 'Подготовить короткое заключение по режиму работы насоса после проверки телеметрии.', task: { assignee: currentUserAssignee, status: 'Новое', statusTime: '13:35 26.08.2026' } },
  { id: 'thread-9', initials: 'СЛ', author: 'Соколова Л. Д., ведущий технолог', time: '14:10 26.08.2026', text: 'Проверьте, пожалуйста, тренд давления на приёме после последнего замера и приложите вывод по риску остановки.', task: { assignee: currentUserAssignee, status: 'Новое', statusTime: '14:10 26.08.2026' } },
  { id: 'thread-10', initials: 'ИД', author: 'Иванов И. И., начальник цеха добычи', time: '15:20 26.08.2026', text: 'Сверить параметры работы скважины с плановым режимом и подготовить краткий отчёт.', task: { assignee: 'Петров А. П.', status: 'Новое', statusTime: '15:20 26.08.2026' } },
  { id: 'thread-11', initials: 'МР', author: 'Морозов Р. С., диспетчер промысла', time: '16:05 26.08.2026', text: 'Проверить готовность оборудования к плановому осмотру на следующей смене.', task: { assignee: 'Егорова А. М.', status: 'В работе', statusTime: '16:05 26.08.2026' } },
  { id: 'thread-status-step-11-demo', parentId: 'thread-11', initials: 'ЕА', author: 'Егорова А. М., специалист ППД', time: '16:40 26.08.2026', text: 'Статус изменён на «В работе». Оборудование подготовлено, осмотр включён в план следующей смены.', reply: true },
]

const initialPageComments: PageComment[] = [
  { id: 'page-1', wellId: 20, initials: 'СЛ', author: 'Соколова Л. Д., ведущий технолог', path: 'Месторождение1 / Куст1 / Скважина-20', time: '17:16 15.12.2024', text: 'Дебит снизился на 8% относительно планового значения. Нужна проверка режима ЭЦН.', unread: true },
  { id: 'page-2', wellId: 12, initials: 'АП', author: 'Петров А. П., главный геолог', path: 'Месторождение1 / Куст1 / Скважина-12', time: '13:20 14.12.2024, ред.', text: 'Обводнённость растёт третьи сутки. Предлагаю уточнить профиль притока перед корректировкой режима.', unread: true },
  { id: 'page-3', wellId: 11, initials: 'КН', author: 'Кузнецова Н. В., инженер по добыче', path: 'Месторождение1 / Куст1 / Скважина-11', time: '12:48 14.12.2024', text: 'Телеметрия восстановлена, пропуски данных за ночную смену загружены в архив.' },
  { id: 'page-4', wellId: 20, initials: 'МР', author: 'Морозов Р. С., диспетчер промысла', path: 'Месторождение1 / Куст1 / Скважина-20', time: '11:42 14.12.2024', text: 'Бригада подтвердила выезд на диагностику. Ориентировочное время прибытия — 08:30.' },
  { id: 'page-5', wellId: 12, initials: 'ЕА', author: 'Егорова А. М., специалист ППД', path: 'Месторождение1 / Куст1 / Скважина-12', time: '10:15 13.12.2024', text: 'Отклонений по ближайшему нагнетательному фонду не выявлено, давление поддерживается в норме.' },
  { id: 'page-6', wellId: 11, initials: 'ВК', author: 'Волков К. О., механик участка', path: 'Месторождение1 / Куст1 / Скважина-11', time: '09:05 12.12.2024', text: 'Осмотр устьевой арматуры выполнен. Утечек и замечаний по герметичности нет.' },
  { id: 'page-7', wellId: 20, initials: 'МТ', author: 'Вы, пользователь СППР', path: 'Месторождение1 / Куст1 / Скважина-20', time: '13:22 26.08.2026', text: 'Проверить режим ЭЦН и приложить результат диагностики после выезда бригады.', unread: true, task: { assignee: 'Соколова Л. Д.', status: 'В работе', statusTime: '13:22 26.08.2026' } },
  { id: 'status-step-7-demo', wellId: 20, initials: 'СЛ', author: 'Соколова Л. Д., ведущий технолог', path: 'Месторождение1 / Куст1 / Скважина-20', time: '14:05 26.08.2026', text: 'Статус изменён на «В работе». Задание принято в работу, диагностика запланирована на текущую смену.', reply: true, parentId: 'page-7' },
  { id: 'page-8', wellId: 12, initials: 'МТ', author: 'Вы, пользователь СППР', path: 'Месторождение1 / Куст1 / Скважина-12', time: '13:35 26.08.2026', text: 'Подготовить заключение по росту обводнённости и подтвердить необходимость профиля притока.', task: { assignee: currentUserAssignee, status: 'Новое', statusTime: '13:35 26.08.2026' } },
  { id: 'page-9', wellId: 20, initials: 'СЛ', author: 'Соколова Л. Д., ведущий технолог', path: 'Месторождение1 / Куст1 / Скважина-20', time: '14:10 26.08.2026', text: 'Проверьте тренд давления на приёме после последнего замера и приложите вывод по риску остановки.', task: { assignee: currentUserAssignee, status: 'Новое', statusTime: '14:10 26.08.2026' } },
  { id: 'page-10', wellId: 11, initials: 'ИД', author: 'Иванов И. И., начальник цеха добычи', path: 'Месторождение1 / Куст1 / Скважина-11', time: '15:20 26.08.2026', text: 'Сверить параметры работы скважины с плановым режимом и подготовить краткий отчёт.', task: { assignee: 'Петров А. П.', status: 'Новое', statusTime: '15:20 26.08.2026' } },
  { id: 'page-11', wellId: 12, initials: 'МР', author: 'Морозов Р. С., диспетчер промысла', path: 'Месторождение1 / Куст1 / Скважина-12', time: '16:05 26.08.2026', text: 'Проверить готовность оборудования к плановому осмотру на следующей смене.', task: { assignee: 'Егорова А. М.', status: 'В работе', statusTime: '16:05 26.08.2026' } },
  { id: 'status-step-11-demo', wellId: 12, initials: 'ЕА', author: 'Егорова А. М., специалист ППД', path: 'Месторождение1 / Куст1 / Скважина-12', time: '16:40 26.08.2026', text: 'Статус изменён на «В работе». Оборудование подготовлено, осмотр включён в план следующей смены.', reply: true, parentId: 'page-11' },
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
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} МБ`
}
const getFileExtension = (name: string, type: string) => {
  const extension = name.split('.').pop()?.trim().toUpperCase()
  if (extension && extension !== name.toUpperCase()) return extension.slice(0, 4)
  if (type.startsWith('image/')) return type.split('/')[1]?.toUpperCase().slice(0, 4) ?? 'IMG'
  return 'FILE'
}
const getHiddenAttachmentLabel = (count: number) => {
  const mod10 = count % 10
  const mod100 = count % 100
  const word = mod10 === 1 && mod100 !== 11 ? 'файл' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'файла' : 'файлов'
  return `+ ещё ${count} ${word}`
}
const getAuthorName = (author: string) => author.split(',')[0].trim()
const getTaskActionText = (comment: Comment) => {
  if (!comment.task) return comment.reply ? `${getAuthorName(comment.author)} оставил комментарий` : `${getAuthorName(comment.author)} добавил комментарий`
  const authorName = comment.author === currentUserAssignee ? 'Вы' : getAuthorName(comment.author)
  return `${authorName} создал задачу, исполнитель - ${comment.task.assignee}`
}

function CommentAttachments({ files }: { files: Attachment[] | undefined }) {
  const [preview, setPreview] = useState<Attachment | null>(null)
  useEffect(() => {
    if (!preview) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setPreview(null) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [preview])
  if (!files || files.length === 0) return null
  return <>
    <ul className="comment-attachments" aria-label="Прикреплённые файлы">{files.map((file) => {
      const extension = getFileExtension(file.name, file.type)
      const isImage = file.type.startsWith('image/')
      return <li className={isImage ? 'is-image' : ''} key={`${file.name}-${file.size}-${file.previewUrl ?? ''}`}>
        {isImage && file.previewUrl ? <button className="comment-attachment-preview" type="button" onClick={() => setPreview(file)} aria-label={`Открыть изображение ${file.name}`}><img src={file.previewUrl} alt="" /></button> : <span className="comment-attachment-type" aria-hidden="true">{extension}</span>}
        <span className="comment-attachment-info"><strong>{file.name}</strong><small>{extension} · {formatFileSize(file.size)}{isImage ? ' · фото' : ''}</small></span>
        {file.previewUrl && <a className="comment-attachment-download" href={file.previewUrl} download={file.name} aria-label={`Скачать файл ${file.name}`}><IconDownload size="xs" /></a>}
      </li>
    })}</ul>
    {preview?.previewUrl && <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={`Просмотр изображения ${preview.name}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null) }}>
      <div className="image-lightbox-content"><button className="image-lightbox-close" type="button" onClick={() => setPreview(null)} aria-label="Закрыть просмотр">×</button><img src={preview.previewUrl} alt={preview.name} /><span>{preview.name}</span></div>
    </div>}
  </>
}

const getComposerHeightForAttachments = (count: number) => {
  if (count === 0) return 124
  return count <= 2 ? 216 : 268
}

const getTaskStatusTooltip = (comment: Comment) => `Статус присвоен: ${comment.task?.statusTime ?? comment.time}`

const canChangeTaskStatus = (comment: Comment) => Boolean(comment.task && (comment.task.assignee === currentUserAssignee || comment.author === currentUserAssignee))
const canEditCommentText = (comment: Comment) => !comment.task || comment.author === currentUserAssignee
const isOwnTask = (comment: Comment) => Boolean(comment.task && (comment.task.assignee === currentUserAssignee || comment.author === currentUserAssignee))
const canDeleteComment = (comment: Comment) => !comment.task || comment.author === currentUserAssignee

const formatTaskDate = (time: string) => {
  const match = time.match(/^(\d{2}:\d{2})\s+(\d{2}\.\d{2}\.\d{4})(.*)$/)
  return match ? match[2] + ', ' + match[1] + match[3] : time
}
const getTaskPartyName = (name: string) => name === currentUserAssignee ? 'Вы' : getAuthorName(name)
type TaskSummaryProps = { comment: Comment; menuControl: ReactNode; onStatusClick: (anchor: HTMLElement) => void; contextPath?: string }
const TaskSummary = ({ comment, menuControl, onStatusClick }: TaskSummaryProps) => {
  if (!comment.task) return null
  const statusClass = comment.task.status === 'Новое' ? 'new' : comment.task.status === 'В работе' ? 'progress' : 'closed'
  const statusControl = canChangeTaskStatus(comment)
    ? <button type="button" className={`task-status-badge status-tooltip status-${statusClass}`} data-tooltip={getTaskStatusTooltip(comment)} onClick={(event) => onStatusClick(event.currentTarget)}>{comment.task.status}<IconArrowDown size="xs" /></button>
    : <span className={`task-status-badge status-tooltip status-${statusClass}`} tabIndex={0} data-tooltip={getTaskStatusTooltip(comment)}>{comment.task.status}</span>
  return <div className={`comment-task-card task-summary status-${statusClass}`}>
    <div className="task-card-heading"><p>{comment.text}</p>{menuControl}</div>
    <div className="task-card-schedule"><span className="task-card-created"><IconCalendar size="xs" aria-hidden="true" />Создано {formatTaskDate(comment.time)}</span><i className="task-card-schedule-divider" aria-hidden="true" />{statusControl}</div>
    <div className="task-card-parties"><span><small>Автор</small><strong>{getTaskPartyName(comment.author)}</strong></span><span><small>Исполнитель</small><strong>{getTaskPartyName(comment.task.assignee)}</strong></span></div>
  </div>
}

const TaskVariantOneSummary = ({ comment, menuControl, onStatusClick, contextPath = getWellPath(20) }: TaskSummaryProps) => {
  if (!comment.task) return null
  const statusClass = comment.task.status === 'Новое' ? 'new' : comment.task.status === 'В работе' ? 'progress' : 'closed'
  const statusControl = canChangeTaskStatus(comment)
    ? <button type="button" className={`task-status-badge status-tooltip status-${statusClass}`} data-tooltip={getTaskStatusTooltip(comment)} onClick={(event) => onStatusClick(event.currentTarget)}>{comment.task.status}<IconArrowDown size="xs" /></button>
    : <span className={`task-status-badge status-tooltip status-${statusClass}`} tabIndex={0} data-tooltip={getTaskStatusTooltip(comment)}>{comment.task.status}</span>
  return <div className={`variant-one-task-summary status-${statusClass}`}>
    <div className="variant-one-task-heading"><div className="variant-one-task-identity"><strong>{getAuthorName(comment.author)}</strong>{statusControl}</div>{menuControl}</div>
    <small className="variant-one-task-context">{contextPath} · {comment.time}</small>
    <div className="variant-one-task-assignee"><span>Исполнитель: <strong>{getTaskPartyName(comment.task.assignee)}</strong></span></div>
    <p className="variant-one-task-description">{comment.text}</p>
  </div>
}

const formatHistoryTime = (time: string) => time.match(/^(\d{2}:\d{2})/)?.[1] ?? time
const formatHistoryDate = (time: string) => time.match(/\d{2}:\d{2}\s+(\d{2}\.\d{2}\.\d{4})/)?.[1] ?? time

const VariantTwoTaskHistory = ({ comment, replies }: { comment: Comment; replies: Comment[] }) => {
  const steps = [{ label: 'Создано', status: 'new', author: comment.author, time: comment.time, text: '', assignee: getTaskPartyName(comment.task?.assignee ?? ''), from: undefined, to: undefined }, ...replies.map((reply) => {
    const isClosed = reply.text.includes('Закрыт');
    const isProgress = reply.text.includes('В работе');
    return { label: isClosed ? 'Закрыто' : isProgress ? 'Взято в работу' : 'Комментарий', status: isClosed ? 'closed' : isProgress ? 'progress' : 'comment', author: reply.author, time: reply.time, text: reply.text.replace(/^Статус изменён на «[^»]+»\.\s*/, ''), assignee: undefined, from: isClosed ? 'В работе' : isProgress ? 'Новое' : undefined, to: isClosed ? 'Закрыто' : isProgress ? 'В работе' : undefined };
  })];
  return <div className="variant-two-task-history" aria-label="История задачи">
    {steps.map((step, index) => <div className={`variant-two-history-step status-${step.status}`} key={`${step.time}-${index}`}>
      <span className="variant-two-history-marker" aria-hidden="true" />
      <div className="variant-two-history-content">
        <div className="variant-two-history-head"><strong>{step.label}</strong><time>{formatHistoryTime(step.time)}</time></div>
        <div className="variant-two-history-author">{getAuthorName(step.author)} · {formatHistoryDate(step.time)}</div>
        {index === 0 && <div className="variant-two-history-assignee">Исполнитель — {step.assignee}</div>}
        {step.from && <div className="variant-two-history-transition"><span>{step.from}</span><b aria-hidden="true">→</b><span>{step.to}</span></div>}
        {step.text && <p>{step.text}</p>}
      </div>
    </div>)}
  </div>
}

type PageCommentItemProps = {
  comment: PageComment
  mode: 'edit' | 'reply' | null
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  onMenu: (comment: PageComment, anchor: HTMLElement) => void
  onTaskStatusChange: (comment: PageComment, anchor: HTMLElement) => void
  statusDraft?: { status: TaskStatus; text: string } | null
  onStatusDraftChange?: (value: string) => void
  onStatusSubmit?: (event: FormEvent<HTMLFormElement>) => void
  onStatusCancel?: () => void
  statusAttachments?: Attachment[]
  statusFileInputRef?: RefObject<HTMLInputElement | null>
  onStatusAttach?: (files: FileList | null) => void
  taskReplyCount?: number
  taskReplies?: Comment[]
  taskDetailsExpanded?: boolean
  onToggleTaskDetails?: () => void
  isTaskReply?: boolean
  variantTwo?: boolean
}

const PageCommentItem = ({ comment, mode, draft, onDraftChange, onSubmit, onCancel, onMenu, onTaskStatusChange, statusDraft, onStatusDraftChange, onStatusSubmit, onStatusCancel, statusAttachments = [], statusFileInputRef, onStatusAttach, taskReplyCount = 0, taskReplies = [], taskDetailsExpanded = false, onToggleTaskDetails, isTaskReply = false, variantTwo = false }: PageCommentItemProps) => (
  <article className={`page-comment${comment.reply ? ' is-reply' : ''}${isTaskReply ? ' is-task-reply' : ''}${comment.task ? ` is-task status-${comment.task.status === 'Новое' ? 'new' : comment.task.status === 'В работе' ? 'progress' : 'closed'}` : ''}${isOwnTask(comment) ? ' is-related-task' : ''}`}>
    <span className={`avatar ${getAvatarTone(comment.initials)}`}>{comment.initials}</span>
    <div className="page-comment-content">
      {comment.task ? (variantTwo ? <TaskSummary comment={comment} menuControl={<Button className="page-comment-menu comment-menu" size="xs" view="clear" onlyIcon iconLeft={IconKebab} label={`Действия с комментарием ${getAuthorName(comment.author)}`} onClick={(event) => onMenu(comment, event.currentTarget as HTMLElement)} />} onStatusClick={(anchor) => onTaskStatusChange(comment, anchor)} /> : <TaskVariantOneSummary comment={comment} contextPath={comment.path} menuControl={<Button className="page-comment-menu comment-menu" size="xs" view="clear" onlyIcon iconLeft={IconKebab} label={`Действия с комментарием ${getAuthorName(comment.author)}`} onClick={(event) => onMenu(comment, event.currentTarget as HTMLElement)} />} onStatusClick={(anchor) => onTaskStatusChange(comment, anchor)} />) : <>
        <div className="page-comment-author">{comment.unread && <i aria-label="Новый комментарий" />}<strong>{getAuthorName(comment.author)}</strong><Button className="page-comment-menu" size="xs" view="clear" onlyIcon iconLeft={IconKebab} label={`Действия с комментарием ${getAuthorName(comment.author)}`} onClick={(event) => onMenu(comment, event.currentTarget as HTMLElement)} /></div>
        <small className="page-comment-context">{comment.path} · {comment.time}</small>
        {comment.replyTo && <div className="page-comment-reply-reference"><IconReply size="xs" aria-hidden="true" /><span title={comment.replyToText}>Ответ на: {comment.replyTo}{comment.replyToText ? ` — ${comment.replyToText}` : ''}</span></div>}
      </>}
      {!comment.task && <p>{comment.text}</p>}
      <CommentAttachments files={comment.attachments} />
      {comment.task && taskReplyCount > 0 && <Button className="page-task-details-toggle" size="xs" view="clear" iconLeft={taskDetailsExpanded ? IconArrowDown : IconArrowRight} iconSize="xs" label={variantTwo ? (taskDetailsExpanded ? `Свернуть (${taskReplyCount})` : `Подробнее (${taskReplyCount})`) : (taskDetailsExpanded ? `Свернуть комментарии (${taskReplyCount})` : `Комментарии к заданию (${taskReplyCount})`)} aria-expanded={taskDetailsExpanded} onClick={onToggleTaskDetails} />}
      {variantTwo && comment.task && taskDetailsExpanded && <VariantTwoTaskHistory comment={comment} replies={taskReplies} />}
      {statusDraft && <form className="task-status-comment-form" action="#" method="post" onSubmit={onStatusSubmit}>
        <label className="visually-hidden" htmlFor={`page-task-status-comment-${comment.id}`}>Комментарий к статусу</label>
        <textarea id={`page-task-status-comment-${comment.id}`} rows={3} autoFocus placeholder={`Комментарий к статусу «${statusDraft.status}»`} value={statusDraft.text} onChange={(event) => onStatusDraftChange?.(event.target.value)} />
        <CommentAttachments files={statusAttachments} />
        <div className="task-status-comment-actions"><Button size="xs" view="clear" onlyIcon iconLeft={IconAttach} label="Прикрепить файл" onClick={() => statusFileInputRef?.current?.click()} /><input ref={statusFileInputRef} className="visually-hidden" name="status-attachments" type="file" multiple onChange={(event) => onStatusAttach?.(event.target.files)} /><div className="page-comment-inline-actions"><Button size="xs" type="submit" disabled={statusDraft.status === 'Закрыто' && !statusDraft.text.trim()} label="Сохранить статус" /><Button size="xs" view="clear" type="button" label="Отмена" onClick={onStatusCancel} /></div></div>
      </form>}
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
  const [selectedWell, setSelectedWell] = useState<number | null>(null)
  const [section, setSection] = useState(sections[0])
  const [assistantTab, setAssistantTab] = useState(assistantTabs[0])
  const [assistantCommentContext, setAssistantCommentContext] = useState<string | null>(null)
  const [assistantHighlightedContext, setAssistantHighlightedContext] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<number | null>(0)
  const [activeCommentTool, setActiveCommentTool] = useState<number | null>(null)
  const [pageCommentsOpen, setPageCommentsOpen] = useState(false)
  const [pageComments, setPageComments] = useState<PageComment[]>(initialPageComments)
  const [showCommentMarkers, setShowCommentMarkers] = useState(true)
  const [pageCommentFilter, setPageCommentFilter] = useState<PageCommentFilter>('comments')
  const [pageTaskFilter, setPageTaskFilter] = useState<PageTaskFilter>('all')
  const [activeTab, setActiveTab] = useState('Информация')
  const [message, setMessage] = useState('')
  const [threadComments, setThreadComments] = useState<Comment[]>(initialComments)
  const [chartCommentsByContext, setChartCommentsByContext] = useState<Record<string, Comment[]>>({})
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [announcement, setAnnouncement] = useState('')
  const [activatingWell, setActivatingWell] = useState<number | null>(null)
  const [unreadWellIds, setUnreadWellIds] = useState<Set<number>>(() => new Set([12, 20]))
  const [expandedReplyThreads, setExpandedReplyThreads] = useState<Set<string>>(() => new Set(['thread-1', 'thread-7', 'thread-11', 'page-7', 'page-11']))
  const [expandedVariantTwoTaskHistory, setExpandedVariantTwoTaskHistory] = useState<Set<string>>(() => new Set())
  const [expandedPageTaskThreads, setExpandedPageTaskThreads] = useState<Set<string>>(() => new Set())
  const [menuCommentIndex, setMenuCommentIndex] = useState<number | null>(null)
  const [taskStatusCommentIndex, setTaskStatusCommentIndex] = useState<number | null>(null)
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [editingAttachments, setEditingAttachments] = useState<File[]>([])
  const [replyingCommentIndex, setReplyingCommentIndex] = useState<number | null>(null)
  const [threadReplyText, setThreadReplyText] = useState('')
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null)
  const [recipientMenuOpen, setRecipientMenuOpen] = useState(false)
  const [composerMode, setComposerMode] = useState<'comment' | 'task'>('comment')
  const [commentFilter, setCommentFilter] = useState<CommentFilter>('all')
  const [composerHeight, setComposerHeight] = useState(124)
  const commentSort: CommentSort = 'newest'
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null)
  const [menuPageCommentId, setMenuPageCommentId] = useState<string | null>(null)
  const [pageTaskStatusCommentId, setPageTaskStatusCommentId] = useState<string | null>(null)
  const [pageInlineAction, setPageInlineAction] = useState<{ id: string; mode: 'edit' | 'reply' } | null>(null)
  const [pageInlineDraft, setPageInlineDraft] = useState('')
  const [pendingTaskStatus, setPendingTaskStatus] = useState<{ scope: 'thread' | 'page'; id: string; index?: number; status: TaskStatus } | null>(null)
  const [taskStatusCommentText, setTaskStatusCommentText] = useState('')
  const [taskStatusAttachments, setTaskStatusAttachments] = useState<PendingAttachment[]>([])
  const activationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const editFileInputRef = useRef<HTMLInputElement | null>(null)
  const taskStatusFileInputRef = useRef<HTMLInputElement | null>(null)
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const previewUrls = useRef<Set<string>>(new Set())
  const commentMenuAnchorRef = useRef<HTMLElement>(null)
  const taskStatusMenuAnchorRef = useRef<HTMLElement>(null)
  const pageCommentMenuAnchorRef = useRef<HTMLElement>(null)
  const recipientMenuAnchorRef = useRef<HTMLElement>(null)
  const selected = wells.find((well) => well.id === selectedWell) ?? null
  const hasScopedChartThread = section.id === 'visual-assistant' && assistantCommentContext !== null && Object.hasOwn(chartCommentsByContext, assistantCommentContext)
  const currentThreadComments = hasScopedChartThread && assistantCommentContext ? chartCommentsByContext[assistantCommentContext] : threadComments
  const sortedCurrentThreadEntries = getSortedCommentEntries(currentThreadComments, commentSort)
  const sortedThreadEntries = getSortedCommentEntries(threadComments, commentSort)
  const filterCommentEntries = (entries: ReturnType<typeof getSortedCommentEntries>) => entries.filter(({ comment }) => {
    const parentTask = comment.reply && comment.parentId ? currentThreadComments.find((item) => item.id === comment.parentId && item.task) : null
    const taskComment = comment.task ? comment : parentTask
    if (section.id === 'variant-2') {
      if (activeTab === 'Задания') return Boolean(taskComment?.task) && (commentFilter !== 'myTasks' || (taskComment ? isOwnTask(taskComment) : false))
      return !taskComment?.task
    }
    if (commentFilter === 'all') return true
    if (!taskComment?.task) return false
    return commentFilter === 'tasks' || isOwnTask(taskComment)
  })
  const visibleCurrentThreadEntries = filterCommentEntries(sortedCurrentThreadEntries)
  const visibleThreadEntries = filterCommentEntries(sortedThreadEntries)
  const filteredPageComments = pageComments.filter((comment) => {
    if (pageCommentFilter === 'comments') return !comment.task && !(comment.reply && comment.parentId && pageComments.some((item) => item.id === comment.parentId && item.task))
    const parentTask = comment.reply && comment.parentId ? pageComments.find((item) => item.id === comment.parentId && item.task) : null
    const taskComment = comment.task ? comment : parentTask
    if (!taskComment?.task) return false
    if (comment.reply && parentTask && (section.id !== 'variant-2' ? !expandedPageTaskThreads.has(parentTask.id) : true)) return false
    if (pageTaskFilter === 'mine') return isOwnTask(taskComment)
    if (pageTaskFilter === 'active') return taskComment.task.status !== 'Закрыто'
    if (pageTaskFilter === 'closed') return taskComment.task.status === 'Закрыто'
    return true
  })
  const unreadPageComments = filteredPageComments.filter((comment) => comment.unread)
  const readPageComments = filteredPageComments.filter((comment) => !comment.unread)
  const selectedPageMenuComment = pageComments.find((comment) => comment.id === menuPageCommentId)
  const selectedPageMenuItems = (selectedPageMenuComment?.reply || selectedPageMenuComment?.task ? pageReplyMenuItems : pageCommentMenuItems).filter((item) => (item.key !== 'edit' || !selectedPageMenuComment || canEditCommentText(selectedPageMenuComment)) && (item.key !== 'delete' || !selectedPageMenuComment || canDeleteComment(selectedPageMenuComment)))
  const selectedThreadMenuComment = menuCommentIndex === null ? null : visibleThreadEntries[menuCommentIndex]?.comment
  const selectedThreadMenuItems = commentMenuItems.filter((item) => (item.key !== 'edit' || !selectedThreadMenuComment || canEditCommentText(selectedThreadMenuComment)) && (item.key !== 'delete' || !selectedThreadMenuComment || canDeleteComment(selectedThreadMenuComment)))
  const updateCurrentThreadComments = (updater: (current: Comment[]) => Comment[]) => {
    if (hasScopedChartThread && assistantCommentContext) {
      setChartCommentsByContext((current) => ({ ...current, [assistantCommentContext]: updater(current[assistantCommentContext] ?? []) }))
    } else {
      setThreadComments(updater)
    }
  }
  const visibleAttachments = attachments.slice(0, 4)
  const hiddenAttachmentCount = attachments.length - visibleAttachments.length
  const startComposerResize = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startY = event.clientY
    const startHeight = composerHeight
    const resize = (moveEvent: globalThis.PointerEvent) => {
      const nextHeight = Math.min(360, Math.max(112, startHeight + startY - moveEvent.clientY))
      setComposerHeight(nextHeight)
    }
    const stopResize = () => {
      window.removeEventListener('pointermove', resize)
      window.removeEventListener('pointerup', stopResize)
    }
    window.addEventListener('pointermove', resize)
    window.addEventListener('pointerup', stopResize, { once: true })
  }
  const pendingAttachmentItems = attachments.length > 0 && <ul className="composer-attachments" aria-label="Выбранные файлы">
    {visibleAttachments.map(({ file, previewUrl }, index) => {
      const extension = getFileExtension(file.name, file.type)
      return <li className="composer-attachment" key={`${file.name}-${file.size}-${file.lastModified}`}>
        {previewUrl ? <span className="composer-file-preview"><img src={previewUrl} alt="" /></span> : <span className="composer-file-type" aria-hidden="true">{extension}</span>}
        <span className="composer-file-details"><strong>{file.name}</strong><small>{extension} · {formatFileSize(file.size)}</small></span>
        <Button className="composer-attachment-remove" size="xs" view="clear" onlyIcon iconLeft={IconClose} label={`Удалить файл ${file.name}`} onClick={() => removeAttachment(index)} />
      </li>
    })}
    {hiddenAttachmentCount > 0 && <li className="composer-attachment-more">{getHiddenAttachmentLabel(hiddenAttachmentCount)}</li>}
  </ul>

  const hasComposerDraft = Boolean(message.trim() || selectedRecipient || attachments.length > 0)
  const clearComposerDraft = () => {
    setMessage('')
    setSelectedRecipient(null)
    setRecipientMenuOpen(false)
    setAttachments((current) => {
      current.forEach(({ previewUrl }) => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
          previewUrls.current.delete(previewUrl)
        }
      })
      return []
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
    composerTextareaRef.current?.focus()
  }
  const sidebarTabs = selected ? [
    { label: 'Информация' },
    { label: 'Комментарии', rightSide: <b>{threadComments.length}</b> },
    ...(section.id === 'variant-2' ? [{ label: 'Задания', rightSide: <b>{threadComments.filter((comment) => Boolean(comment.task)).length}</b> }] : []),
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

  const openPageTaskStatusMenu = (comment: PageComment, anchor: HTMLElement) => {
    if (!canChangeTaskStatus(comment)) return
    taskStatusMenuAnchorRef.current = anchor
    setPageTaskStatusCommentId((current) => current === comment.id ? null : comment.id)
  }

  const showPageCommentInObject = (comment: PageComment, action: 'open' | 'edit' | 'reply') => {
    if (action === 'open') setShowCommentMarkers(true)
    const parent = comment.parentId ? pageComments.find((item) => item.id === comment.parentId) : null
    const hasReplies = pageComments.some((item) => item.parentId === comment.id)
    const objectComment: Comment = { id: comment.id, parentId: comment.parentId, initials: comment.initials, author: comment.author, time: comment.time, text: comment.text, root: comment.task ? true : hasReplies, reply: Boolean(comment.parentId), task: comment.task, attachments: comment.attachments }
    setThreadComments((current) => {
      const withoutOpenedThread = current.filter((item) => item.id !== comment.id && item.id !== parent?.id)
      if (!parent) return [objectComment, ...withoutOpenedThread]
      const parentComment: Comment = { id: parent.id, initials: parent.initials, author: parent.author, time: parent.time, text: parent.text, root: true, task: parent.task, attachments: parent.attachments }
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
    setActiveTab(comment.task || parent?.task ? 'Задания' : 'Комментарии')
    setCommentFilter(comment.task || parent?.task ? 'all' : 'all')
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
    if (action.key === 'edit' && !canEditCommentText(comment)) {
      setMenuPageCommentId(null)
      setAnnouncement('Текст задания редактировать нельзя')
      return
    }
    if (action.key === 'delete' && !canDeleteComment(comment)) {
      setMenuPageCommentId(null)
      setAnnouncement('Удалить задание может только его создатель')
      return
    }
    if (action.key === 'delete' && comment.task && !window.confirm('Удалить это задание?')) {
      setMenuPageCommentId(null)
      return
    }
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
    taskReplyCount={comment.task ? pageComments.filter((item) => item.parentId === comment.id).length : 0}
    taskReplies={comment.task ? pageComments.filter((item) => item.parentId === comment.id) : []}
    taskDetailsExpanded={comment.task ? expandedPageTaskThreads.has(comment.id) : false}
    isTaskReply={Boolean(comment.reply && pageComments.some((item) => item.id === comment.parentId && item.task))}
    variantTwo={section.id === 'variant-2'}
    onToggleTaskDetails={comment.task ? () => setExpandedPageTaskThreads((current) => { const next = new Set(current); if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id); return next }) : undefined}
    comment={comment}
    mode={pageInlineAction?.id === comment.id ? pageInlineAction.mode : null}
    draft={pageInlineAction?.id === comment.id ? pageInlineDraft : ''}
    onDraftChange={setPageInlineDraft}
    onSubmit={(event) => submitPageInlineAction(event, comment)}
    onCancel={() => { setPageInlineAction(null); setPageInlineDraft('') }}
    onMenu={openPageCommentMenu}
    onTaskStatusChange={openPageTaskStatusMenu}
    statusDraft={pendingTaskStatus?.scope === 'page' && pendingTaskStatus.id === comment.id ? { status: pendingTaskStatus.status, text: taskStatusCommentText } : null}
    onStatusDraftChange={setTaskStatusCommentText}
    onStatusSubmit={(event) => submitTaskStatusComment(event)}
    onStatusCancel={() => { setPendingTaskStatus(null); setTaskStatusCommentText(''); setTaskStatusAttachments([]) }}
    statusAttachments={taskStatusAttachments.map(({ file: { name, size, type }, previewUrl }) => ({ name, size, type, previewUrl }))}
    statusFileInputRef={taskStatusFileInputRef}
    onStatusAttach={addTaskStatusAttachments}
  />

  const selectTab = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'Задания' && section.id === 'variant-2') {
      setComposerMode('task')
      setCommentFilter('all')
    } else if (tab === 'Комментарии' && section.id === 'variant-2') {
      setComposerMode('comment')
      setCommentFilter('all')
    }
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
      const nextAttachments = [...current, ...added]
      if (added.length > 0) {
        const requiredHeight = getComposerHeightForAttachments(nextAttachments.length)
        setComposerHeight((height) => Math.max(height, requiredHeight))
      }
      return nextAttachments
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
    if ((composerMode === 'task' && (!message.trim() || !selectedRecipient)) || (composerMode === 'comment' && !message.trim() && attachments.length === 0) || (selectedWell === null && assistantCommentContext === null)) return
    const now = new Date()
    const time = `${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ${now.toLocaleDateString('ru-RU')}`
    updateCurrentThreadComments((current) => [{
      initials: 'МТ',
      author: 'Вы, пользователь СППР',
      time,
      text: message.trim(),
      recipient: composerMode === 'task' && selectedRecipient ? selectedRecipient : undefined,
      task: composerMode === 'task' && selectedRecipient ? { assignee: selectedRecipient, status: 'Новое', statusTime: time } : undefined,
      attachments: attachments.map(({ file: { name, size, type }, previewUrl }) => ({ name, size, type, previewUrl })),
    }, ...current])
    setMessage('')
    setAttachments([])
    setSelectedRecipient(null)
    setRecipientMenuOpen(false)
    setComposerMode('comment')
    setAnnouncement('Комментарий добавлен')
  }

  const openCommentMenu = (index: number, anchor: HTMLElement) => {
    commentMenuAnchorRef.current = anchor
    setMenuCommentIndex((current) => current === index ? null : index)
  }

  const handleCommentMenuAction = (action: (typeof commentMenuItems)[number]) => {
    if (menuCommentIndex === null) return
    const targetComment = visibleThreadEntries[menuCommentIndex]?.comment
    if (!targetComment) return
    if (action.key === 'edit' && !canEditCommentText(targetComment)) {
      setMenuCommentIndex(null)
      setAnnouncement('Текст задания редактировать нельзя')
      return
    }
    if (action.key === 'delete' && !canDeleteComment(targetComment)) {
      setMenuCommentIndex(null)
      setAnnouncement('Удалить задание может только его создатель')
      return
    }
    if (action.key === 'delete' && targetComment.task && !window.confirm('Удалить это задание?')) {
      setMenuCommentIndex(null)
      return
    }
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


  const addTaskStatusAttachments = (files: FileList | null) => {
    if (!files?.length) return
    const selectedFiles = Array.from(files)
    setTaskStatusAttachments((current) => {
      const existing = new Set(current.map(({ file }) => `${file.name}:${file.size}:${file.lastModified}`))
      const added = selectedFiles.filter((file) => !existing.has(`${file.name}:${file.size}:${file.lastModified}`)).map((file) => {
        if (!file.type.startsWith('image/')) return { file }
        const previewUrl = URL.createObjectURL(file)
        previewUrls.current.add(previewUrl)
        return { file, previewUrl }
      })
      return [...current, ...added]
    })
    if (taskStatusFileInputRef.current) taskStatusFileInputRef.current.value = ''
  }


  const updatePageTaskStatus = (statusItem: (typeof taskStatusItems)[number]) => {
    if (pageTaskStatusCommentId === null) return
    setPendingTaskStatus({ scope: 'page', id: pageTaskStatusCommentId, status: statusItem.label as TaskStatus })
    setTaskStatusCommentText('')
    setTaskStatusAttachments([])
    setPageTaskStatusCommentId(null)
  }

  const updateTaskStatus = (statusItem: (typeof taskStatusItems)[number]) => {
    if (taskStatusCommentIndex === null) return
    const target = currentThreadComments[taskStatusCommentIndex]
    if (!target?.task || !canChangeTaskStatus(target)) return
    setPendingTaskStatus({ scope: 'thread', id: target.id ?? `thread-index-${taskStatusCommentIndex}`, index: taskStatusCommentIndex, status: statusItem.label as TaskStatus })
    setTaskStatusCommentText('')
    setTaskStatusAttachments([])
    setTaskStatusCommentIndex(null)
  }

  const submitTaskStatusComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!pendingTaskStatus || (pendingTaskStatus.status === 'Закрыто' && !taskStatusCommentText.trim())) return
    const now = new Date()
    const time = `${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ${now.toLocaleDateString('ru-RU')}`
    const statusComment = taskStatusCommentText.trim()
    const statusText = statusComment ? `Статус изменён на «${pendingTaskStatus.status}». ${statusComment}` : `Статус изменён на «${pendingTaskStatus.status}».`
    const statusAttachments = taskStatusAttachments.map(({ file: { name, size, type }, previewUrl }) => ({ name, size, type, previewUrl }))
    if (pendingTaskStatus.scope === 'page') {
      const target = pageComments.find((comment) => comment.id === pendingTaskStatus.id)
      if (!target?.task || !canChangeTaskStatus(target)) return
      const step: PageComment = { id: `status-step-${Date.now()}`, wellId: target.wellId, initials: 'МТ', author: currentUserAssignee, path: target.path, time, text: statusText, reply: true, parentId: target.id, replyTo: target.author, replyToText: target.text, attachments: statusAttachments }
      setPageComments((current) => {
        const updated = current.map((comment) => comment.id === target.id && comment.task ? { ...comment, task: { ...comment.task, status: pendingTaskStatus.status, statusTime: time } } : comment)
        const parentIndex = updated.findIndex((comment) => comment.id === target.id)
        return parentIndex < 0 ? updated : [...updated.slice(0, parentIndex + 1), step, ...updated.slice(parentIndex + 1)]
      })
      let linkedThreadTaskId: string | undefined
      setThreadComments((current) => {
        const targetIndex = current.findIndex((comment) => comment.task && (
          comment.id === target.id ||
          (comment.author === target.author && comment.time === target.time && comment.task.assignee === target.task?.assignee) ||
          (comment.text === target.text && comment.task.assignee === target.task?.assignee)
        ))
        if (targetIndex < 0) return current
        const threadTarget = current[targetIndex]
        linkedThreadTaskId = threadTarget.id
        const threadStep: Comment = { id: `thread-status-step-${Date.now()}`, initials: 'МТ', author: currentUserAssignee, time, text: statusText, reply: true, parentId: threadTarget.id, attachments: statusAttachments }
        const updatedThreadTarget = { ...threadTarget, task: { ...threadTarget.task!, status: pendingTaskStatus.status, statusTime: time }, root: true }
        return [...current.slice(0, targetIndex), updatedThreadTarget, threadStep, ...current.slice(targetIndex + 1)]
      })
      setExpandedReplyThreads((current) => {
        const next = new Set(current)
        next.add(target.id)
        if (linkedThreadTaskId) next.add(linkedThreadTaskId)
        return next
      })
    } else {
      let updatedTaskId: string | undefined
      updateCurrentThreadComments((current) => {
        const index = pendingTaskStatus.index ?? current.findIndex((comment) => comment.id === pendingTaskStatus.id)
        const target = current[index]
        if (!target?.task || !canChangeTaskStatus(target)) return current
        updatedTaskId = target.id
        const step: Comment = { id: `status-step-${Date.now()}`, initials: 'МТ', author: currentUserAssignee, time, text: statusText, reply: true, parentId: target.id, attachments: statusAttachments }
        const updatedTarget = { ...target, task: { ...target.task, status: pendingTaskStatus.status, statusTime: time }, root: true }
        return [...current.slice(0, index), updatedTarget, step, ...current.slice(index + 1)]
      })
      if (updatedTaskId) {
        const taskId = updatedTaskId
        setPageComments((current) => current.map((comment) => comment.id === taskId && comment.task ? { ...comment, task: { ...comment.task, status: pendingTaskStatus.status, statusTime: time } } : comment))
        setExpandedReplyThreads((current) => new Set(current).add(taskId))
      }
    }
    setPendingTaskStatus(null)
    setTaskStatusCommentText('')
    setTaskStatusAttachments([])
    setAnnouncement('Статус задания изменён, комментарий добавлен')
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

  const pageCommentsPanel = pageCommentsOpen && <aside id="page-comments-panel" className={`object-card page-comments-card${section.id === 'variant-2' ? ' variant-two-object-card' : ''}`} aria-label="Все комментарии на странице">
    <div className="card-heading page-comments-heading"><div className="page-comment-type-switch" aria-label="Тип записей">{pageCommentFilterItems.map((item) => <button key={item.key} type="button" aria-pressed={pageCommentFilter === item.key} className={pageCommentFilter === item.key ? 'is-active' : ''} onClick={() => setPageCommentFilter(item.key)}>{item.label}</button>)}</div><Button className="sidebar-icon-button" size="xs" view="clear" onlyIcon iconLeft={IconClose} label="Закрыть комментарии" onClick={closePageComments} /></div>
    {pageCommentFilter === 'tasks' && <div className="page-task-filter" aria-label="Фильтр заданий">{pageTaskFilterItems.map((item) => <button key={item.key} type="button" aria-pressed={pageTaskFilter === item.key} className={pageTaskFilter === item.key ? 'is-active' : ''} onClick={() => setPageTaskFilter(item.key)}>{item.label}</button>)}</div>}
    <div className="page-comments-list">
      {pageCommentFilter === 'tasks' ? filteredPageComments.length > 0 ? <div className="page-comment-items">{filteredPageComments.map((comment) => renderPageComment(withCurrentCommentContext(comment)))}</div> : <div className="comments-empty page-comments-empty">Заданий по этому фильтру нет</div> : <>
        {unreadPageComments.length === 0 && readPageComments.length === 0 && <div className="comments-empty page-comments-empty">Комментариев пока нет</div>}
        {unreadPageComments.length > 0 && <section aria-labelledby="unread-comments-title">
          <div className="comment-group-heading"><Text id="unread-comments-title" size="xs" view="secondary" fontStyle="italic">Не прочитано</Text><Button size="xs" view="clear" label="Прочитать всё" onClick={() => setPageComments((current) => current.map((comment) => ({ ...comment, unread: false })))} /></div>
          <div className="page-comment-items">{unreadPageComments.map((comment) => renderPageComment(withCurrentCommentContext(comment)))}</div>
        </section>}
        <section aria-labelledby="read-comments-title">
          <div className="comment-group-heading"><Text id="read-comments-title" size="xs" view="secondary" fontStyle="italic">Прочитано</Text></div>
          <div className="page-comment-items">{readPageComments.map((comment) => renderPageComment(withCurrentCommentContext(comment)))}</div>
        </section>
      </>}
    </div>
    <ContextMenu className="comment-context-menu" size="s" items={selectedPageMenuItems} isOpen={menuPageCommentId !== null} anchorRef={pageCommentMenuAnchorRef as RefObject<HTMLElement>} direction="downStartRight" spareDirection="upStartRight" onItemClick={handlePageCommentMenuAction} onClickOutside={() => setMenuPageCommentId(null)} onEsc={() => setMenuPageCommentId(null)} />
    <ContextMenu className="comment-context-menu" size="s" items={taskStatusItems} isOpen={pageTaskStatusCommentId !== null} anchorRef={taskStatusMenuAnchorRef as RefObject<HTMLElement>} direction="downStartRight" spareDirection="upStartRight" onItemClick={updatePageTaskStatus} onClickOutside={() => setPageTaskStatusCommentId(null)} onEsc={() => setPageTaskStatusCommentId(null)} />
  </aside>

  const assistantObjectPanel = section.id === 'visual-assistant' && assistantCommentContext && !pageCommentsOpen && <aside id="assistant-object-panel" className="object-card assistant-object-card" aria-label={`Информация по объекту: Добыча нефти / ${assistantCommentContext}`}>
    <div className="card-heading object-card-heading"><div className="badges"><span>ЦИФРОВОЙ ДВОЙНИК</span></div><div className="object-card-actions"><ToolbarButton size="xs" view="clear" onlyIcon iconLeft={IconObjectOpen} label="Открыть цифровой двойник" tooltipProps={{ tooltipContent: 'Открыть цифровой двойник' }} /><ToolbarButton size="xs" view="clear" onlyIcon iconLeft={IconObjectMap} label="Показать на карте" tooltipProps={{ tooltipContent: 'Показать на карте' }} /><ToolbarButton className="sidebar-icon-button" size="xs" view="clear" onlyIcon iconLeft={IconClose} label="Закрыть" tooltipProps={{ tooltipContent: 'Закрыть' }} onClick={() => { setAssistantCommentContext(null); setAssistantHighlightedContext(null) }} /></div></div>
    <Text className="object-card-title" weight="semibold" size="xs">Добыча нефти / {assistantCommentContext}</Text>
    <Tabs className="sidebar-tabs" size="xs" view="bordered" items={[{ label: 'Комментарии', rightSide: <b>{currentThreadComments.length}</b> }]} value={{ label: 'Комментарии', rightSide: <b>{currentThreadComments.length}</b> }} onChange={() => undefined} />
    <form className="comment-form" action="#" method="post" style={{ '--composer-height': `${composerHeight}px` } as CSSProperties} onSubmit={submitComment}>
      <div className="comment-form-resizer" role="separator" aria-orientation="horizontal" aria-label="Изменить высоту поля ввода" onPointerDown={startComposerResize} />
      <label className="visually-hidden" htmlFor="assistant-comment-message">Текст комментария</label>
      <div className="composer">
        <div className={composerMode === 'task' ? 'composer-input is-task' : 'composer-input'}>
          <div className="composer-mode-switch" aria-label="Тип сообщения"><button type="button" aria-pressed={composerMode === 'comment'} className={composerMode === 'comment' ? 'is-active' : ''} onClick={() => { setComposerMode('comment'); setSelectedRecipient(null); setRecipientMenuOpen(false) }}>Комментарий</button><button type="button" aria-pressed={composerMode === 'task'} className={composerMode === 'task' ? 'is-active' : ''} onClick={() => setComposerMode('task')}>Задание</button>{hasComposerDraft && <button type="button" className="composer-reset" onClick={clearComposerDraft}>Сбросить</button>}</div>
          <textarea ref={composerTextareaRef} id="assistant-comment-message" name="message" placeholder={composerMode === 'task' ? "Введите текст задания" : "Введите текст комментария"} value={message} onChange={(event) => setMessage(event.target.value)} />
          {pendingAttachmentItems}
          <div className="composer-toolbar">
            <Button className="attach-button" size="xs" view="clear" onlyIcon iconLeft={IconAttach} label="Прикрепить файл" onClick={() => fileInputRef.current?.click()} />
            <input ref={fileInputRef} className="visually-hidden" id="assistant-comment-files" name="attachments" type="file" multiple onChange={(event) => addAttachments(event.target.files)} />
            {composerMode === 'task' && <button type="button" className={`toolbar-assignee${selectedRecipient ? '' : ' is-empty'}`} aria-invalid={!selectedRecipient} aria-haspopup="menu" aria-expanded={recipientMenuOpen} onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); recipientMenuAnchorRef.current = event.currentTarget; setRecipientMenuOpen((value) => !value) }}>{selectedRecipient ? <i>{getPersonInitials(selectedRecipient)}</i> : <IconUser size="xs" />}<span>{selectedRecipient ?? <>Исполнитель <b aria-hidden="true">*</b></>}</span><IconArrowDown size="xs" /></button>}
            <Button className="send-button" size="xs" type="submit" view="primary" onlyIcon iconLeft={IconSendMessage} iconSize="xs" disabled={composerMode === 'task' ? !message.trim() || !selectedRecipient : !message.trim() && attachments.length === 0} label={composerMode === 'task' ? 'Создать задание' : 'Отправить'} />
          </div>
        </div>
        <ContextMenu className="recipient-context-menu" size="s" items={recipientMenuItems} isOpen={recipientMenuOpen} anchorRef={recipientMenuAnchorRef as RefObject<HTMLElement>} direction="downStartRight" spareDirection="upStartRight" onItemClick={(item) => { setSelectedRecipient(String(item.label)); setRecipientMenuOpen(false); composerTextareaRef.current?.focus() }} onClickOutside={() => setRecipientMenuOpen(false)} onEsc={() => setRecipientMenuOpen(false)} />
      </div>
    </form>
    <p className="visually-hidden" aria-live="polite">{announcement}</p>
    <div className="comment-filter" aria-label="Фильтр комментариев">
      {commentFilterItems.map((item) => <button key={item.key} type="button" aria-pressed={commentFilter === item.key} className={commentFilter === item.key ? 'is-active' : ''} onClick={() => setCommentFilter(item.key)}>{item.label}</button>)}
    </div>
    <div className="comments assistant-object-comments">
      {visibleCurrentThreadEntries.length === 0 && <div className="comments-empty">Записей по этому фильтру нет</div>}
      {visibleCurrentThreadEntries.map(({ comment, index }) => {
        if (comment.reply && comment.parentId && !expandedReplyThreads.has(comment.parentId)) return null
        const isEditing = editingCommentIndex === index
        const commentId = comment.id ?? `comment-${index}`
        const branchReplyCount = currentThreadComments.filter((item) => item.reply && item.parentId === commentId).length
        const branchExpanded = expandedReplyThreads.has(commentId)
        return <article className={['comment', comment.reply ? 'is-reply' : '', comment.task && isOwnTask(comment) ? 'is-related-task' : '', comment.id === highlightedCommentId ? 'is-highlighted' : ''].filter(Boolean).join(' ')} key={comment.id ?? `${comment.time}-${index}`}>
          <span className={`avatar ${getAvatarTone(comment.initials)}`}>{comment.initials}</span>
          <div className="comment-content">
            <div className="comment-title">
              <strong>{getAuthorName(comment.author)}</strong>
              <Button className="comment-menu" size="xs" view="clear" onlyIcon iconLeft={comment.root && !comment.task ? IconReply : IconKebab} label={comment.root && !comment.task ? 'Ответить' : 'Меню комментария'} aria-expanded={comment.root && !comment.task ? replyingCommentIndex === index : menuCommentIndex === index} onClick={comment.root && !comment.task ? () => { setReplyingCommentIndex((current) => current === index ? null : index); setThreadReplyText('') } : (event) => openCommentMenu(index, event.currentTarget as HTMLElement)} />
            </div>
            <div className="comment-meta-row"><small className="comment-meta">{assistantTab.label} / Добыча нефти / {assistantCommentContext}</small><small>{comment.time}</small></div>
            {comment.task && <div className={`comment-task-card status-${comment.task.status === 'Новое' ? 'new' : comment.task.status === 'В работе' ? 'progress' : 'closed'}`}><div className="comment-task-meta"><p>{comment.text}</p>{canChangeTaskStatus(comment) ? <button type="button" className={`task-status-badge status-tooltip status-${comment.task.status === 'Новое' ? 'new' : comment.task.status === 'В работе' ? 'progress' : 'closed'}`} data-tooltip={getTaskStatusTooltip(comment)} onClick={(event) => { taskStatusMenuAnchorRef.current = event.currentTarget; setTaskStatusCommentIndex(index) }}>{comment.task.status}<IconArrowDown size="xs" /></button> : <span className={`task-status-badge status-tooltip status-${comment.task.status === 'Новое' ? 'new' : comment.task.status === 'В работе' ? 'progress' : 'closed'}`} tabIndex={0} data-tooltip={getTaskStatusTooltip(comment)}>{comment.task.status}</span>}</div><small className="comment-action-line">{getTaskActionText(comment)}</small></div>}
            {pendingTaskStatus?.scope === 'thread' && pendingTaskStatus.index === index && <form className="task-status-comment-form" action="#" method="post" onSubmit={submitTaskStatusComment}><label className="visually-hidden" htmlFor={`task-status-comment-${index}`}>Комментарий к статусу</label><textarea id={`task-status-comment-${index}`} rows={3} autoFocus placeholder={`Комментарий к статусу «${pendingTaskStatus.status}»`} value={taskStatusCommentText} onChange={(event) => setTaskStatusCommentText(event.target.value)} /><CommentAttachments files={taskStatusAttachments.map(({ file: { name, size, type }, previewUrl }) => ({ name, size, type, previewUrl }))} /><div className="task-status-comment-actions"><Button size="xs" view="clear" onlyIcon iconLeft={IconAttach} label="Прикрепить файл" onClick={() => taskStatusFileInputRef.current?.click()} /><input ref={taskStatusFileInputRef} className="visually-hidden" name="status-attachments" type="file" multiple onChange={(event) => addTaskStatusAttachments(event.target.files)} /><div className="page-comment-inline-actions"><Button size="xs" type="submit" disabled={pendingTaskStatus?.status === 'Закрыто' && !taskStatusCommentText.trim()} label="Сохранить статус" /><Button size="xs" view="clear" type="button" label="Отмена" onClick={() => { setPendingTaskStatus(null); setTaskStatusCommentText(''); setTaskStatusAttachments([]) }} /></div></div></form>}
            
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
            </div> : !comment.task && comment.text && <p>{comment.text}</p>}
            <CommentAttachments files={comment.attachments} />
            {comment.root && replyingCommentIndex === index && <form className="thread-reply-form" action="#" method="post" onSubmit={(event) => submitThreadReply(event, index)}>
              <label className="visually-hidden" htmlFor={`assistant-thread-reply-${index}`}>Текст ответа</label>
              <textarea id={`assistant-thread-reply-${index}`} name="reply" rows={3} autoFocus placeholder="Введите текст ответа" value={threadReplyText} onChange={(event) => setThreadReplyText(event.target.value)} />
              <div className="thread-reply-actions"><Button size="xs" type="submit" disabled={!threadReplyText.trim()} label="Ответить" /><Button size="xs" type="button" view="clear" label="Отмена" onClick={() => { setReplyingCommentIndex(null); setThreadReplyText('') }} /></div>
            </form>}
          </div>
          {(comment.root || comment.task) && branchReplyCount > 0 && <Button className="reply-link" size="xs" view="clear" iconLeft={branchExpanded ? IconArrowDown : IconArrowRight} iconSize="xs" label={`${comment.task ? 'Подробнее' : 'Ответы'} (${branchReplyCount})`} aria-expanded={branchExpanded} onClick={() => setExpandedReplyThreads((current) => { const next = new Set(current); if (next.has(commentId)) next.delete(commentId); else next.add(commentId); return next })} />}
        </article>
      })}
      <ContextMenu className="comment-context-menu" size="s" items={selectedThreadMenuItems} isOpen={menuCommentIndex !== null} anchorRef={commentMenuAnchorRef as RefObject<HTMLElement>} direction="downStartRight" spareDirection="upStartRight" onItemClick={handleCommentMenuAction} onClickOutside={() => setMenuCommentIndex(null)} onEsc={() => setMenuCommentIndex(null)} />
        <ContextMenu className="comment-context-menu" size="s" items={taskStatusItems} isOpen={taskStatusCommentIndex !== null} anchorRef={taskStatusMenuAnchorRef as RefObject<HTMLElement>} direction="downStartRight" spareDirection="upStartRight" onItemClick={updateTaskStatus} onClickOutside={() => setTaskStatusCommentIndex(null)} onEsc={() => setTaskStatusCommentIndex(null)} />
    </div>
  </aside>

  return (
    <Theme preset={presetGpnDefault} className="theme-root">
      <div className="app-shell">
        <header className="topbar">
          <div className="brand-block">
            <Button className="header-menu-button" size="s" view="clear" onlyIcon iconLeft={IconHamburger} label="Открыть меню" />
            <Select className="header-field header-section" dropdownClassName="header-section-dropdown" style={{ zIndex: 100 }} size="s" ariaLabel="Раздел" items={sections} value={section} onChange={(value) => value && !value.disabled && setSection(value)} />
          </div>
        </header>

        <main id="content" className="workspace">
          {pageCommentsPanel}
          {assistantObjectPanel}
          {section.id === 'visual-assistant' ? <VisualAssistant commentsOpen={pageCommentsOpen} commentCount={threadComments.length} showCommentMarkers={showCommentMarkers} selectedCommentContext={assistantCommentContext} highlightedCommentContext={assistantHighlightedContext} onToggleComments={() => setPageCommentsOpen((value) => !value)} onToggleCommentMarkers={() => setShowCommentMarkers((value) => !value)} onShowObjectInfo={() => { if (assistantCommentContext) setPageCommentsOpen(false) }} activeTab={assistantTab} onTabChange={setAssistantTab} onOpenObjectComments={(context) => { setPageCommentsOpen(false); setHighlightedCommentId(null); setAssistantHighlightedContext(null); setAssistantCommentContext(context) }} onAddChartComment={(context, text, attachments) => { const now = new Date(); const newComment: Comment = { id: `chart-comment-${Date.now()}`, initials: 'МТ', author: 'Вы, пользователь СППР', time: `${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ${now.toLocaleDateString('ru-RU')}`, text: `${text}`, attachments, root: false }; setChartCommentsByContext((current) => ({ ...current, [context]: [newComment, ...(current[context] ?? [])] })); setPageCommentsOpen(false); setAssistantCommentContext(context); setShowCommentMarkers(true); setAnnouncement('Комментарий добавлен') }} /> : false ? <div className="variant-empty" aria-label="Вариант 2" /> : <>
          <div className="toolbars" aria-label="Инструменты схемы">
            <div className="toolbar">
              {primaryTools.map((tool, index) => (
                <ToolbarButton key={tool.label} className="tool" size="xs" view={activeTool === index ? 'primary' : 'clear'} onlyIcon iconLeft={tool.icon} label={tool.label} tooltipProps={{ tooltipContent: tool.label }} disabled={[1, 2, 3, 5].includes(index)} onClick={[1, 2, 3, 5].includes(index) ? undefined : () => selectPrimaryTool(index)} aria-pressed={activeTool === index} aria-expanded={index === 4 ? pageCommentsOpen : undefined} />
              ))}
            </div>
            <div className="toolbar">
              {commentTools.map((tool, index) => {
                const isUnavailable = index === 0 || index === 2
                const isActive = isUnavailable ? false : index === 1 ? showCommentMarkers : activeCommentTool === index
                return <ToolbarButton key={tool.label} className="tool" size="xs" view={isActive ? 'primary' : 'clear'} onlyIcon iconLeft={tool.icon} label={tool.label} tooltipProps={section.id === 'variant-2' ? undefined : { tooltipContent: tool.label }} disabled={isUnavailable} onClick={isUnavailable ? undefined : () => index === 1 ? setShowCommentMarkers((value) => !value) : setActiveCommentTool((value) => value === index ? null : index)} aria-pressed={isUnavailable ? undefined : isActive} />
              })}
            </div>
          </div>

          {selected && !pageCommentsOpen && <aside id="object-panel" className={`object-card${section.id === 'variant-2' ? ' variant-two-object-card' : ''}`} aria-label={'Информация: ' + selected.name}>
            <div className="card-heading object-card-heading"><div className="badges"><span>ЦИФРОВОЙ ДВОЙНИК</span></div><div className="object-card-actions"><ToolbarButton size="xs" view="clear" onlyIcon iconLeft={IconObjectOpen} label="Открыть цифровой двойник" tooltipProps={{ tooltipContent: 'Открыть цифровой двойник' }} /><ToolbarButton size="xs" view="clear" onlyIcon iconLeft={IconObjectMap} label="Показать на карте" tooltipProps={{ tooltipContent: 'Показать на карте' }} /><ToolbarButton className="sidebar-icon-button" size="xs" view="clear" onlyIcon iconLeft={IconClose} label="Закрыть" tooltipProps={{ tooltipContent: 'Закрыть' }} onClick={closeObjectPanel} /></div></div>
            <Text className="object-card-title" weight="semibold" size="xs">{selected.name.replace('-', ' ')}</Text>
            <Tabs className="sidebar-tabs" size="xs" view="bordered" items={sidebarTabs} value={sidebarTabs.find((tab) => tab.label === activeTab)} onChange={(tab) => selectTab(String(tab.label))} />
            {activeTab === 'Комментарии' || (section.id === 'variant-2' && activeTab === 'Задания') ? <>
              <form className="comment-form" action="#" method="post" style={{ '--composer-height': `${composerHeight}px` } as CSSProperties} onSubmit={submitComment}>
                <div className="comment-form-resizer" role="separator" aria-orientation="horizontal" aria-label="Изменить высоту поля ввода" onPointerDown={startComposerResize} />
                <label className="visually-hidden" htmlFor="comment-message">Текст комментария</label>
                <div className="composer">
                  <div className={composerMode === 'task' ? 'composer-input is-task' : 'composer-input'}>
                    <div className="composer-mode-switch" aria-label="Тип сообщения"><button type="button" aria-pressed={composerMode === 'comment'} className={composerMode === 'comment' ? 'is-active' : ''} onClick={() => { setComposerMode('comment'); setSelectedRecipient(null); setRecipientMenuOpen(false) }}>Комментарий</button><button type="button" aria-pressed={composerMode === 'task'} className={composerMode === 'task' ? 'is-active' : ''} onClick={() => setComposerMode('task')}>Задание</button>{hasComposerDraft && <button type="button" className="composer-reset" onClick={clearComposerDraft}>Сбросить</button>}</div>
                    <textarea ref={composerTextareaRef} id="comment-message" name="message" placeholder={composerMode === 'task' ? "Введите текст задания" : "Введите текст комментария"} value={message} onChange={(event) => setMessage(event.target.value)} />
                    {pendingAttachmentItems}
                    <div className="composer-toolbar">
                      <Button className="attach-button" size="xs" view="clear" onlyIcon iconLeft={IconAttach} label="Прикрепить файл" onClick={() => fileInputRef.current?.click()} />
                      <input ref={fileInputRef} className="visually-hidden" id="comment-files" name="attachments" type="file" multiple onChange={(event) => addAttachments(event.target.files)} />
                      {composerMode === 'task' && <button type="button" className={`toolbar-assignee${selectedRecipient ? '' : ' is-empty'}`} aria-invalid={!selectedRecipient} aria-haspopup="menu" aria-expanded={recipientMenuOpen} onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); recipientMenuAnchorRef.current = event.currentTarget; setRecipientMenuOpen((value) => !value) }}>{selectedRecipient ? <i>{getPersonInitials(selectedRecipient)}</i> : <IconUser size="xs" />}<span>{selectedRecipient ?? <>Исполнитель <b aria-hidden="true">*</b></>}</span><IconArrowDown size="xs" /></button>}
                      <Button className="send-button" size="xs" type="submit" view="primary" onlyIcon iconLeft={IconSendMessage} iconSize="xs" disabled={composerMode === 'task' ? !message.trim() || !selectedRecipient : !message.trim() && attachments.length === 0} label={composerMode === 'task' ? 'Создать задание' : 'Отправить'} />
                    </div>
                  </div>
                  <ContextMenu className="recipient-context-menu" size="s" items={recipientMenuItems} isOpen={recipientMenuOpen} anchorRef={recipientMenuAnchorRef as RefObject<HTMLElement>} direction="downStartRight" spareDirection="upStartRight" onItemClick={(item) => { setSelectedRecipient(String(item.label)); setRecipientMenuOpen(false); composerTextareaRef.current?.focus() }} onClickOutside={() => setRecipientMenuOpen(false)} onEsc={() => setRecipientMenuOpen(false)} />
                </div>
              </form>
              <p className="visually-hidden" aria-live="polite">{announcement}</p>
              {section.id === 'variant-2' && activeTab === 'Задания' ? <div className="comment-filter" aria-label="Фильтр заданий">
                {commentFilterItems.filter((item) => item.key === 'all' || item.key === 'myTasks').map((item) => <button key={item.key} type="button" aria-pressed={commentFilter === item.key} className={commentFilter === item.key ? 'is-active' : ''} onClick={() => setCommentFilter(item.key)}>{item.key === 'myTasks' ? 'Мои задания' : 'Все'}</button>)}
              </div> : section.id !== 'variant-2' ? <div className="comment-filter" aria-label="Фильтр комментариев">
                {commentFilterItems.map((item) => <button key={item.key} type="button" aria-pressed={commentFilter === item.key} className={commentFilter === item.key ? 'is-active' : ''} onClick={() => setCommentFilter(item.key)}>{item.label}</button>)}
              </div> : null}
              <div className="comments">
                {visibleThreadEntries.length === 0 && <div className="comments-empty">Записей по этому фильтру нет</div>}
                {visibleThreadEntries.map(({ comment, index }) => {
                  const parentComment = comment.parentId ? threadComments.find((item) => item.id === comment.parentId) : null
                  const isVariantTwoTaskReply = section.id === 'variant-2' && Boolean(parentComment?.task)
      if (comment.reply && comment.parentId && (isVariantTwoTaskReply || !expandedReplyThreads.has(comment.parentId))) return null
                  const isEditing = editingCommentIndex === index
                  const commentId = comment.id ?? `comment-${index}`
                  const branchReplyCount = threadComments.filter((item) => item.reply && item.parentId === commentId).length
                  const branchExpanded = section.id === 'variant-2' && comment.task
                    ? expandedVariantTwoTaskHistory.has(commentId)
                    : expandedReplyThreads.has(commentId)
                  return <article className={['comment', comment.reply ? 'is-reply' : '', section.id === 'variant-2' && comment.task && isOwnTask(comment) ? 'is-related-task' : '', comment.id === highlightedCommentId ? 'is-highlighted' : ''].filter(Boolean).join(' ')} key={comment.id ?? `${comment.time}-${index}`}>
                    <span className={`avatar ${getAvatarTone(comment.initials)}`}>{comment.initials}</span>
                    <div className="comment-content">
                      <div className="comment-title">
                        <strong>{getAuthorName(comment.author)}</strong>
                        <Button className="comment-menu" size="xs" view="clear" onlyIcon iconLeft={comment.root && !comment.task ? IconReply : IconKebab} label={comment.root && !comment.task ? 'Ответить' : 'Меню комментария'} aria-expanded={comment.root && !comment.task ? replyingCommentIndex === index : menuCommentIndex === index} onClick={comment.root && !comment.task ? () => { setReplyingCommentIndex((current) => current === index ? null : index); setThreadReplyText('') } : (event) => openCommentMenu(index, event.currentTarget as HTMLElement)} />
                      </div>
                      {section.id === 'variant-2' && !comment.task && <small className="comment-time comment-time-below">{comment.time}</small>}
                      {section.id !== 'variant-2' && !comment.task && <small className="comment-time comment-time-below variant-one-comment-context">{getWellPath(selected.id)} · {comment.time}</small>}
                      {comment.task && (section.id === 'variant-2' ? <TaskSummary comment={comment} menuControl={<Button className="comment-menu" size="xs" view="clear" onlyIcon iconLeft={IconKebab} label="Меню задания" aria-expanded={menuCommentIndex === index} onClick={(event) => openCommentMenu(index, event.currentTarget as HTMLElement)} />} onStatusClick={(anchor) => { taskStatusMenuAnchorRef.current = anchor; setTaskStatusCommentIndex(index) }} /> : <TaskVariantOneSummary comment={comment} contextPath={getWellPath(selected.id)} menuControl={<Button className="comment-menu" size="xs" view="clear" onlyIcon iconLeft={IconKebab} label="Меню задания" aria-expanded={menuCommentIndex === index} onClick={(event) => openCommentMenu(index, event.currentTarget as HTMLElement)} />} onStatusClick={(anchor) => { taskStatusMenuAnchorRef.current = anchor; setTaskStatusCommentIndex(index) }} />)}
                      {pendingTaskStatus?.scope === 'thread' && pendingTaskStatus.index === index && <form className="task-status-comment-form" action="#" method="post" onSubmit={submitTaskStatusComment}><label className="visually-hidden" htmlFor={`task-status-comment-${index}`}>Комментарий к статусу</label><textarea id={`task-status-comment-${index}`} rows={3} autoFocus placeholder={`Комментарий к статусу «${pendingTaskStatus.status}»`} value={taskStatusCommentText} onChange={(event) => setTaskStatusCommentText(event.target.value)} /><CommentAttachments files={taskStatusAttachments.map(({ file: { name, size, type }, previewUrl }) => ({ name, size, type, previewUrl }))} /><div className="task-status-comment-actions"><Button size="xs" view="clear" onlyIcon iconLeft={IconAttach} label="Прикрепить файл" onClick={() => taskStatusFileInputRef.current?.click()} /><input ref={taskStatusFileInputRef} className="visually-hidden" name="status-attachments" type="file" multiple onChange={(event) => addTaskStatusAttachments(event.target.files)} /><div className="page-comment-inline-actions"><Button size="xs" type="submit" disabled={pendingTaskStatus?.status === 'Закрыто' && !taskStatusCommentText.trim()} label="Сохранить статус" /><Button size="xs" view="clear" type="button" label="Отмена" onClick={() => { setPendingTaskStatus(null); setTaskStatusCommentText(''); setTaskStatusAttachments([]) }} /></div></div></form>}
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
                      </div> : !comment.task && comment.text && <p>{comment.text}</p>}
                      <CommentAttachments files={comment.attachments} />
                      {comment.root && replyingCommentIndex === index && <form className="thread-reply-form" action="#" method="post" onSubmit={(event) => submitThreadReply(event, index)}>
                        <label className="visually-hidden" htmlFor={`thread-reply-${index}`}>Текст ответа</label>
                        <textarea id={`thread-reply-${index}`} name="reply" rows={3} autoFocus placeholder="Введите текст ответа" value={threadReplyText} onChange={(event) => setThreadReplyText(event.target.value)} />
                        <div className="thread-reply-actions"><Button size="xs" type="submit" disabled={!threadReplyText.trim()} label="Ответить" /><Button size="xs" type="button" view="clear" label="Отмена" onClick={() => { setReplyingCommentIndex(null); setThreadReplyText('') }} /></div>
                      </form>}
                    </div>
                    {section.id === 'variant-2' && comment.task ? <Button className="reply-link task-history-link" size="xs" view="clear" iconLeft={branchExpanded ? IconArrowDown : IconArrowRight} iconSize="xs" label={`Подробнее (${branchReplyCount + 1})`} aria-expanded={branchExpanded} onClick={() => setExpandedVariantTwoTaskHistory((current) => { const next = new Set(current); if (next.has(commentId)) next.delete(commentId); else next.add(commentId); return next })} /> : (comment.root || comment.task) && branchReplyCount > 0 && <Button className="reply-link" size="xs" view="clear" iconLeft={branchExpanded ? IconArrowDown : IconArrowRight} iconSize="xs" label={`${comment.task ? 'Подробнее' : 'Ответы'} (${branchReplyCount})`} aria-expanded={branchExpanded} onClick={() => setExpandedReplyThreads((current) => { const next = new Set(current); if (next.has(commentId)) next.delete(commentId); else next.add(commentId); return next })} />}
                  {section.id === 'variant-2' && comment.task && branchExpanded && <VariantTwoTaskHistory comment={comment} replies={threadComments.filter((item) => item.reply && item.parentId === commentId)} />}
                  </article>
                })}
                <ContextMenu className="comment-context-menu" size="s" items={selectedThreadMenuItems} isOpen={menuCommentIndex !== null} anchorRef={commentMenuAnchorRef as RefObject<HTMLElement>} direction="downStartRight" spareDirection="upStartRight" onItemClick={handleCommentMenuAction} onClickOutside={() => setMenuCommentIndex(null)} onEsc={() => setMenuCommentIndex(null)} />
        <ContextMenu className="comment-context-menu" size="s" items={taskStatusItems} isOpen={taskStatusCommentIndex !== null} anchorRef={taskStatusMenuAnchorRef as RefObject<HTMLElement>} direction="downStartRight" spareDirection="upStartRight" onItemClick={updateTaskStatus} onClickOutside={() => setTaskStatusCommentIndex(null)} onEsc={() => setTaskStatusCommentIndex(null)} />
              </div>
            </> : <div className="empty-tab"><Text size="s" view="secondary">Данные раздела для {selected.name}</Text></div>}
          </aside>}

          <section className={`scheme${activeCommentTool === 0 ? ' is-comment-mode' : ''}`} aria-label="Схема скважин">
            {wells.map((well) => {
              const isSelected = selectedWell === well.id
              const hasUnread = unreadWellIds.has(well.id)
              const className = ['well', `status-${well.status}`, isSelected ? 'selected' : 'inactive-pin', activatingWell === well.id ? 'pin-activating' : ''].filter(Boolean).join(' ')
              return <div key={well.id} className={className} style={{ '--x': well.x + '%', '--y': well.y + '%' } as CSSProperties}>
                {showCommentMarkers && <button className={'comment-marker ' + (hasUnread ? 'has-unread' : 'is-read')} onClick={() => openComments(well.id)} aria-label={`${well.name}: ${threadComments.length} комментариев${hasUnread ? ', есть новые' : ', все прочитаны'}`} aria-pressed={isSelected}>
                  <CommentGlyph />
                  <span>{formatCommentCount(threadComments.length)}</span>
                  <i className="unread-indicator" aria-hidden="true" />
                </button>}
                <button className="well-target" onClick={() => selectWell(well.id)} aria-label={well.name} aria-pressed={isSelected}>
                  {isSelected ? <img className="well-icon well-active-icon pin-head" src="/assets/well-active.svg" alt="" aria-hidden="true" /> : <span className="well-icon well-default-icon pin-head" aria-hidden="true" />}
                  <span className="well-label">{well.name.match(/\d+/)?.[0] ?? well.name}</span>
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
