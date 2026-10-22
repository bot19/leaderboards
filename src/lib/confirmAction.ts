export function leaveLadderConfirm(): string {
  return 'Leave this Ladder? You can rejoin from its Share link.'
}

export function removeMemberConfirm(displayName: string): string {
  return `Remove ${displayName} from this Ladder? Only an Admin can reinstate them.`
}

export function demoteToPlayerConfirm(displayName: string): string {
  return `Demote ${displayName} to Player? They'll no longer be an Admin.`
}

export function voidMatchConfirm(status: 'pending' | 'confirmed'): string {
  if (status === 'confirmed') {
    return 'Void this Match? Every Rating on this Ladder will be recalculated without it.'
  }
  return "Void this Match? It won't count toward any Rating."
}

export function rejectMatchConfirm(): string {
  return "Reject this Match? It will be Voided and won't count toward any Rating."
}
