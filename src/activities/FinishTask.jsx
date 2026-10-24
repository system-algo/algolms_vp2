import { useEffect, useMemo, useRef, useState } from 'react';

function getTaskId(task) {
  return String(
    task?.id ||
    task?.taskId ||
    task?.taskKey ||
    task?.key ||
    '',
  ).trim();
}

export default function FinishTask({
  task,
  onTaskCompleted,
}) {
  const data = task?.finishTask || {};

  const images = useMemo(() => {
    const rawImages =
      Array.isArray(data.images) && data.images.length > 0
        ? data.images
        : [
          {
            src:
              data.image ||
              '/assets/finish/way-to-go.png',
            alt:
              data.alt ||
              task?.title ||
              'Lesson image',
          },
        ];

    return rawImages
      .map((item, index) => {
        if (typeof item === 'string') {
          return {
            src: item,
            alt: `Lesson image ${index + 1}`,
          };
        }

        return {
          src:
            item?.src ||
            item?.image ||
            item?.url ||
            '',
          alt:
            item?.alt ||
            `Lesson image ${index + 1}`,
        };
      })
      .filter((item) => item.src);
  }, [
    data.images,
    data.image,
    data.alt,
    task?.title,
  ]);

  const taskId = getTaskId(task);
  const imageSignature = images
    .map((image) => image.src)
    .join('|');

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [visitedImageIndexes, setVisitedImageIndexes] = useState(
    () => new Set([0]),
  );
  const [isCompleted, setIsCompleted] = useState(false);

  const completionSentRef = useRef(false);

  useEffect(() => {
    setCurrentImageIndex(0);
    setVisitedImageIndexes(
      images.length > 0
        ? new Set([0])
        : new Set(),
    );
    setIsCompleted(false);
    completionSentRef.current = false;
  }, [taskId, imageSignature, images.length]);

  useEffect(() => {
    if (!images.length) {
      return;
    }

    setVisitedImageIndexes((currentIndexes) => {
      if (currentIndexes.has(currentImageIndex)) {
        return currentIndexes;
      }

      const nextIndexes = new Set(currentIndexes);
      nextIndexes.add(currentImageIndex);
      return nextIndexes;
    });
  }, [currentImageIndex, images.length]);

  const hasViewedAllImages =
    images.length > 0 &&
    visitedImageIndexes.size >= images.length;

  useEffect(() => {
    if (
      !hasViewedAllImages ||
      completionSentRef.current
    ) {
      return undefined;
    }

    /*
     * Give the learner a short moment to actually see the final image
     * before marking the static content task complete.
     */
    const completionTimer = window.setTimeout(() => {
      completionSentRef.current = true;
      setIsCompleted(true);

      onTaskCompleted?.({
        taskId,
        completionType: 'viewed-all-images',
        viewedImageCount: images.length,
      });
    }, images.length === 1 ? 1200 : 650);

    return () => {
      window.clearTimeout(completionTimer);
    };
  }, [
    hasViewedAllImages,
    images.length,
    onTaskCompleted,
    taskId,
  ]);

  const hasMultipleImages = images.length > 1;
  const isFirstImage = currentImageIndex === 0;
  const isLastImage =
    currentImageIndex === images.length - 1;

  const currentImage = images[currentImageIndex];

  function showPreviousImage() {
    setCurrentImageIndex((currentIndex) =>
      Math.max(currentIndex - 1, 0),
    );
  }

  function showNextImage() {
    setCurrentImageIndex((currentIndex) =>
      Math.min(
        currentIndex + 1,
        images.length - 1,
      ),
    );
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'ArrowLeft' && !isFirstImage) {
        showPreviousImage();
      }

      if (event.key === 'ArrowRight' && !isLastImage) {
        showNextImage();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [isFirstImage, isLastImage, images.length]);

  if (!currentImage) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: 'calc(100vh - 130px)',
          display: 'grid',
          placeItems: 'center',
          background: '#eef2f6',
          color: '#64748b',
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        No image available.
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: 'calc(100vh - 118px)',
        padding: '18px 24px 62px',
        background: '#eef2f6',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 'min(1240px, 100%)',
          height: 'calc(100vh - 198px)',
          minHeight: 500,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        {hasMultipleImages ? (
          <button
            type="button"
            onClick={showPreviousImage}
            disabled={isFirstImage}
            aria-label="Previous image"
            style={{
              position: 'absolute',
              left: -32,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 3,
              width: 52,
              height: 52,
              display: 'grid',
              placeItems: 'center',
              padding: 0,
              border: 0,
              borderRadius: '50%',
              background: isFirstImage
                ? '#dbe2ec'
                : '#8943ef',
              color: isFirstImage
                ? '#94a3b8'
                : '#ffffff',
              boxShadow: isFirstImage
                ? 'none'
                : '0 10px 22px rgba(137, 67, 239, 0.28)',
              fontSize: 34,
              fontWeight: 900,
              lineHeight: 1,
              cursor: isFirstImage
                ? 'not-allowed'
                : 'pointer',
            }}
          >
            ‹
          </button>
        ) : null}

        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderRadius: 10,
            background: '#ffffff',
            boxShadow:
              '0 12px 32px rgba(15, 23, 42, 0.1)',
          }}
        >
          <img
            key={`${currentImage.src}-${currentImageIndex}`}
            src={currentImage.src}
            alt={currentImage.alt}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center',
              userSelect: 'none',
            }}
          />
        </div>

        {hasMultipleImages ? (
          <button
            type="button"
            onClick={showNextImage}
            disabled={isLastImage}
            aria-label="Next image"
            style={{
              position: 'absolute',
              right: -32,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 3,
              width: 52,
              height: 52,
              display: 'grid',
              placeItems: 'center',
              padding: 0,
              border: 0,
              borderRadius: '50%',
              background: isLastImage
                ? '#dbe2ec'
                : '#8943ef',
              color: isLastImage
                ? '#94a3b8'
                : '#ffffff',
              boxShadow: isLastImage
                ? 'none'
                : '0 10px 22px rgba(137, 67, 239, 0.28)',
              fontSize: 34,
              fontWeight: 900,
              lineHeight: 1,
              cursor: isLastImage
                ? 'not-allowed'
                : 'pointer',
            }}
          >
            ›
          </button>
        ) : null}

        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -48,
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minHeight: 38,
            padding: '7px 14px',
            border: '1px solid rgba(137, 67, 239, 0.16)',
            borderRadius: 999,
            background: '#ffffff',
            color: '#475569',
            boxShadow:
              '0 7px 18px rgba(15, 23, 42, 0.12)',
            fontSize: 13,
            fontWeight: 800,
            whiteSpace: 'nowrap',
          }}
        >
          <span>
            {currentImageIndex + 1} / {images.length}
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {images.map((image, index) => {
              const hasVisited =
                visitedImageIndexes.has(index);

              return (
                <button
                  key={`${image.src}-indicator-${index}`}
                  type="button"
                  onClick={() =>
                    setCurrentImageIndex(index)
                  }
                  aria-label={`Show image ${index + 1}`}
                  style={{
                    width:
                      index === currentImageIndex
                        ? 20
                        : 8,
                    height: 8,
                    padding: 0,
                    border: 0,
                    borderRadius: 999,
                    background:
                      index === currentImageIndex
                        ? '#8943ef'
                        : hasVisited
                          ? '#c9a8f6'
                          : '#d7dee8',
                    cursor: 'pointer',
                    transition:
                      'width 150ms ease, background 150ms ease',
                  }}
                />
              );
            })}
          </div>

          <span
            style={{
              paddingLeft: 10,
              borderLeft: '1px solid #e2e8f0',
              color: isCompleted
                ? '#15803d'
                : '#7c3aed',
              fontWeight: 900,
            }}
          >
            {isCompleted
              ? 'Viewed ✓'
              : `${visitedImageIndexes.size}/${images.length} viewed`}
          </span>
        </div>
      </div>
    </div>
  );
}