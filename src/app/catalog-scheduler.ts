import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core'
import { CmButton, CmIcon, CmStack, CmText } from '@cosmemilton/ui-angular'
import { addDays, dayKey, dayTitle, eventSummary, hourMarks, sampleEvents, scheduleTitle, selectSlot, slots, startMinute,
  time, timeRange, visibleDays, weekdays, type ScheduleEvent } from './reference/catalogScheduler'

@Component({
  selector: 'aurora-catalog-scheduler',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CmButton, CmIcon, CmStack, CmText],
  templateUrl: './catalog-scheduler.html',
})
export class CatalogScheduler {
  readonly advanced = input(false)
  protected readonly today = new Date()
  protected readonly date = signal(this.today)
  protected readonly weekly = signal(false)
  protected readonly selected = signal<ScheduleEvent | undefined>(undefined)
  private readonly events = signal(sampleEvents(this.today))
  protected readonly days = computed(() => visibleDays(this.date(), this.weekly()))
  protected readonly title = computed(() => scheduleTitle(this.days()))
  protected readonly hourMarks = hourMarks
  protected readonly slots = slots
  protected readonly startMinute = startMinute
  protected readonly dayKey = dayKey
  protected readonly dayTitle = dayTitle
  protected readonly weekdays = weekdays
  protected readonly time = time
  protected readonly timeRange = timeRange
  protected readonly eventSummary = eventSummary

  protected advance(sign: number) {
    this.date.update(date => addDays(date, sign * (this.weekly() ? 7 : 1)))
  }

  protected eventsFor(day: Date) {
    return this.events().filter(event => event.day === dayKey(day))
  }

  protected reserve(day: Date, minute: number) {
    const events = this.events()
    const event = selectSlot(events, day, minute)
    if (!events.includes(event)) this.events.set([...events, event])
    this.selected.set(event)
  }
}
