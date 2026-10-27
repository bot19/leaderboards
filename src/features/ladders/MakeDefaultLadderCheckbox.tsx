type Props = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function MakeDefaultLadderCheckbox({ checked, onCheckedChange }: Props) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-sm text-neutral-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="size-4 shrink-0"
      />
      <span className="min-w-0">Make this my Default Ladder</span>
    </label>
  )
}
