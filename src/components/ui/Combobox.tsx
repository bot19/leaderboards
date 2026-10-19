// Copied from bao-ui: src/components/ui/Combobox.tsx

import { IconX } from '@tabler/icons-react'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

export type ComboboxOption = {
  value: string
  label: string
}

type Props = {
  value: string
  onChange: (value: string) => void
  /** Fired on Enter when the input has a non-empty trimmed value (or on option pick). */
  onSubmit: (value: string) => void
  options: ComboboxOption[]
  /**
   * Optional create row (e.g. Add “lunch”) shown above matches so a new value
   * can be committed even when the query only partially matches existing options.
   */
  createOption?: ComboboxOption | null
  /** Debounce before filtering options. Use 0 for instant local lists. */
  debounceMs?: number
  placeholder?: string
  disabled?: boolean
  error?: string
  id?: string
  label?: string
  /** Shown under the input when there is no error (e.g. create hint). */
  hint?: ReactNode
  emptyMessage?: string
  className?: string
}

/** Ignore option commits that look like a list scroll, not a tap. */
const OPTION_TAP_SLOP_PX = 12

/**
 * Text + dropdown combobox. Enter submits the highlighted row (create or
 * match). Clear X appears when the input has a value.
 */
export function Combobox({
  value,
  onChange,
  onSubmit,
  options,
  createOption = null,
  debounceMs = 300,
  placeholder,
  disabled = false,
  error,
  id,
  label,
  hint,
  emptyMessage = 'No matches',
  className = '',
}: Props) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listId = `${inputId}-list`
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const inputRef = useRef<HTMLInputElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const optionGestureRef = useRef<{
    value: string
    startY: number
  } | null>(null)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState(value)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (debounceMs <= 0) {
      setFilter(value)
      return
    }
    const timer = window.setTimeout(() => setFilter(value), debounceMs)
    return () => window.clearTimeout(timer)
  }, [value, debounceMs])

  useEffect(
    () => () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current)
      }
    },
    [],
  )

  const needle = filter.trim().toLowerCase()
  const filtered = needle
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(needle) ||
          option.value.toLowerCase().includes(needle),
      )
    : options

  const rows = useMemo(() => {
    if (!createOption) return filtered
    const withoutDup = filtered.filter(
      (option) => option.value !== createOption.value,
    )
    return [createOption, ...withoutDup]
  }, [createOption, filtered])

  useEffect(() => {
    setActiveIndex(0)
  }, [filter, createOption?.value])

  function cancelClose() {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  function scheduleClose() {
    cancelClose()
    // Soft keyboards / touch often blur the input before the option's click.
    // Keep the list mounted briefly; option pointerdown cancels this.
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      if (optionGestureRef.current) return
      setOpen(false)
    }, 200)
  }

  function commit(raw: string) {
    const next = raw.trim()
    if (!next) return
    cancelClose()
    optionGestureRef.current = null
    onSubmit(next)
    setOpen(false)
  }

  function onOptionPointerDown(
    event: ReactPointerEvent<HTMLLIElement>,
    optionValue: string,
  ) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    // Keep focus on the input so blur doesn't unmount the list mid-tap.
    event.preventDefault()
    cancelClose()
    optionGestureRef.current = {
      value: optionValue,
      startY: event.clientY,
    }
  }

  function onOptionPointerUp(
    event: ReactPointerEvent<HTMLLIElement>,
    optionValue: string,
  ) {
    const gesture = optionGestureRef.current
    optionGestureRef.current = null
    if (!gesture || gesture.value !== optionValue) return
    if (Math.abs(event.clientY - gesture.startY) > OPTION_TAP_SLOP_PX) return
    commit(optionValue)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) =>
        rows.length === 0 ? 0 : Math.min(index + 1, rows.length - 1),
      )
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (open && value.trim() && rows[activeIndex]) {
        commit(rows[activeIndex].value)
        return
      }
      commit(value)
    }
  }

  const showList = open && !disabled
  const describedBy = error ? errorId : hint ? hintId : undefined
  const showEmpty = rows.length === 0

  return (
    <div className={`relative ${className}`.trim()}>
      {label ? (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-800"
        >
          {label}
        </label>
      ) : null}

      <div className={label ? 'relative mt-1.5' : 'relative'}>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && rows[activeIndex]
              ? `${listId}-option-${activeIndex}`
              : undefined
          }
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          className="block w-full rounded-md border border-neutral-300 bg-white py-2 pr-9 pl-3 text-base text-ink shadow-sm outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-400/40 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
          onChange={(event) => {
            onChange(event.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            cancelClose()
            setOpen(true)
          }}
          onBlur={scheduleClose}
          onKeyDown={onKeyDown}
        />

        {value && !disabled ? (
          <button
            type="button"
            aria-label="Clear"
            className="absolute top-1/2 right-2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
              setOpen(true)
            }}
          >
            <IconX size={16} stroke={2} aria-hidden />
          </button>
        ) : null}
      </div>

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {showEmpty ? (
            <li className="px-3 py-2 text-sm text-neutral-500">{emptyMessage}</li>
          ) : (
            rows.map((option, index) => {
              const isCreate =
                createOption != null && option.value === createOption.value
              return (
                <li
                  key={isCreate ? `create:${option.value}` : option.value}
                  id={`${listId}-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={
                    index === activeIndex
                      ? 'cursor-pointer bg-neutral-100 px-3 py-2 text-sm text-ink'
                      : 'cursor-pointer px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50'
                  }
                  onPointerDown={(event) =>
                    onOptionPointerDown(event, option.value)
                  }
                  onPointerUp={(event) =>
                    onOptionPointerUp(event, option.value)
                  }
                  onPointerCancel={() => {
                    optionGestureRef.current = null
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  {isCreate ? (
                    <span className="font-medium text-ink">{option.label}</span>
                  ) : (
                    option.label
                  )}
                </li>
              )
            })
          )}
        </ul>
      ) : null}

      {error ? (
        <p id={errorId} className="mt-1 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-xs text-neutral-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
