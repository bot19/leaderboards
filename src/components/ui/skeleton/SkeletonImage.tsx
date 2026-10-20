// Copied from bao-ui: src/components/ui/skeleton/SkeletonImage.tsx

import {
  useCallback,
  useState,
  type ImgHTMLAttributes,
  type ReactNode,
} from 'react'

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  /** Shown until the image fires load (or error). */
  skeleton: ReactNode
  /** Sizing/position frame around skeleton + image. */
  frameClassName?: string
}

/**
 * Image with a same-size skeleton underneath until decode finishes.
 * Handles cached images via the `complete` check on mount/src change.
 */
export function SkeletonImage({
  skeleton,
  frameClassName,
  className,
  src,
  onLoad,
  onError,
  alt = '',
  ...rest
}: Props) {
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>(undefined)
  const loaded = src != null && loadedSrc === src

  // Adjusting to a new src during render keeps the skeleton up for the next paint.
  const [trackedSrc, setTrackedSrc] = useState(src)
  if (src !== trackedSrc) {
    setTrackedSrc(src)
    setLoadedSrc(undefined)
  }

  const setImgRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (node && src && node.complete && node.naturalWidth > 0) {
        setLoadedSrc(src)
      }
    },
    [src],
  )

  return (
    <div className={cx('relative', frameClassName)}>
      {!loaded ? (
        <div className="absolute inset-0" aria-hidden>
          {skeleton}
        </div>
      ) : null}
      <img
        ref={setImgRef}
        {...rest}
        src={src}
        alt={alt}
        onLoad={(event) => {
          if (src) setLoadedSrc(src)
          onLoad?.(event)
        }}
        onError={(event) => {
          // Drop the shimmer so a broken image doesn't spin forever.
          if (src) setLoadedSrc(src)
          onError?.(event)
        }}
        className={cx(className, !loaded && 'opacity-0')}
      />
    </div>
  )
}
