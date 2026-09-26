"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { galleryPhotos, type GalleryPhoto } from "@/data/info/gallary";

const placeholderColours = [
  "#173D46",
  "#51423A",
  "#384938",
  "#3D354B",
  "#394552",
  "#55363A",
];

const columns = [0, 1, 2].map((column) =>
  galleryPhotos.filter((_, index) => index % 3 === column),
);

type PhotoTileProps = {
  photo: GalleryPhoto;
  index: number;
  duplicate?: boolean;
  onOpen: (photo: GalleryPhoto) => void;
};

function PhotoTile({
  photo,
  index,
  duplicate = false,
  onOpen,
}: PhotoTileProps) {
  return (
    <button
      type="button"
      data-photo
      disabled={!photo.image}
      tabIndex={duplicate ? -1 : undefined}
      onClick={() => onOpen(photo)}
      aria-label={`Open ${photo.alt}`}
      className="group relative block aspect-[4/5] w-full overflow-hidden rounded-lg border border-white/10 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#8DDCFA] disabled:cursor-default min-[900px]:rounded-xl"
    >
      {photo.image ? (
        <Image
          src={photo.image}
          alt={duplicate ? "" : photo.alt}
          fill
          sizes="(min-width: 1200px) 380px, 33vw"
          className="object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex flex-col justify-between p-3 min-[900px]:p-6"
          style={{
            backgroundColor:
              placeholderColours[index % placeholderColours.length],
          }}
        >
          <span className="text-[6px] tracking-[0.12em] text-[#F5F0DE]/65 [font-family:var(--font-pixel)] min-[900px]:text-[9px]">
            TECHXETRA
          </span>

          <span className="self-end text-[clamp(2rem,6vw,5rem)] leading-none text-[#F5F0DE]/25 [font-family:var(--font-ortigel)]">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      )}

      {photo.image && (
        <>
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 min-[900px]:p-5">
            <span className="text-[8px] leading-relaxed text-[#F5F0DE] [font-family:var(--font-gotham-book)] min-[900px]:text-xs">
              {photo.caption}
            </span>

            <span aria-hidden="true" className="hidden text-lg text-[#F5F0DE]/80 min-[900px]:block">
              ↗
            </span>
          </span>
        </>
      )}
    </button>
  );
}

export default function Galary() {
  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const loopsRef = useRef<gsap.core.Tween[]>([]);
  const introRef = useRef<gsap.core.Timeline | null>(null);

  const [manualBrowse, setManualBrowse] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const browsing = manualBrowse || reducedMotion;
  const availablePhotos = galleryPhotos.filter((photo) => Boolean(photo.image));
  const selectedIndex = availablePhotos.findIndex((photo) => photo.id === selectedId);
  const selectedPhoto = availablePhotos[selectedIndex];

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const viewport = viewportRef.current;

    if (!root || !viewport || browsing) return;

    let disposed = false;
    let resizeFrame = 0;

    const context = gsap.context(() => {
      const tracks = Array.from(viewport.querySelectorAll<HTMLElement>("[data-column-track]"));
      const cards = Array.from(viewport.querySelectorAll<HTMLElement>("[data-photo]"));
      const slots = Array.from(viewport.querySelectorAll<HTMLElement>("[data-photo-slot]"));

      // Pause the loops until the opening animation finishes.
      loopsRef.current = tracks.map((track, index) => {
        const group = track.querySelector<HTMLElement>("[data-column-group]");
        const distance = () => group?.offsetHeight ?? 0;
        const movesDown = index === 1;

        return gsap.fromTo(
          track,
          { y: () => (movesDown ? -distance() : 0) },
          {
            y: () => (movesDown ? 0 : -distance()),
            duration: Math.max(distance() / 24, 1),
            ease: "none",
            repeat: -1,
            paused: true,
          },
        );
      });

      // Use stationary wrappers to measure each photo's final position.
      const getStackOffset = (index: number) => {
        const area = viewport.getBoundingClientRect();
        const slot = slots[index].getBoundingClientRect();
        const depth = index % 6;

        return {
          x: area.left + area.width / 2 - slot.left - slot.width / 2 + depth * 2,
          y: area.top + area.height / 2 - slot.top - slot.height / 2 + depth * 7,
        };
      };

      gsap.set(cards, {
        zIndex: (index) => cards.length - index,
        transformOrigin: "50% 50%",
      });

      introRef.current = gsap.timeline({
        delay: 0.25,
        onComplete: () => {
          if (!disposed && !dialogRef.current?.open) {
            loopsRef.current.forEach((loop) => loop.play());
          }
        },
      });

      introRef.current.fromTo(
        cards,
        {
          x: (index) => getStackOffset(index).x,
          y: (index) => getStackOffset(index).y,
          rotation: (index) => ((index % 6) - 2.5) * 1.6,
          scale: 0.88,
        },
        {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          duration: 1.65,
          stagger: { amount: 0.4, from: "center" },
          ease: "power3.inOut",
        },
      );
    }, root);

    const refreshLoops = () => {
      cancelAnimationFrame(resizeFrame);

      resizeFrame = requestAnimationFrame(() => {
        if (disposed) return;

        const tracks = Array.from(viewport.querySelectorAll<HTMLElement>("[data-column-track]"));

        loopsRef.current.forEach((loop, index) => {
          const group = tracks[index]?.querySelector<HTMLElement>("[data-column-group]");
          if (!group) return;

          const progress = loop.progress();
          loop.invalidate().duration(Math.max(group.offsetHeight / 24, 1)).progress(progress);
        });
      });
    };

    window.addEventListener("resize", refreshLoops);
    void document.fonts.ready.then(() => {
      if (!disposed) refreshLoops();
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", refreshLoops);
      context.revert();
      loopsRef.current = [];
      introRef.current = null;
    };
  }, [browsing]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!selectedPhoto) {
      if (dialog.open) dialog.close();

      if (introRef.current?.progress() === 1) {
        loopsRef.current.forEach((loop) => loop.play());
      }

      return;
    }

    loopsRef.current.forEach((loop) => loop.pause());

    if (!dialog.open) dialog.showModal();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedPhoto]);

  const openPhoto = (photo: GalleryPhoto) => {
    if (photo.image) setSelectedId(photo.id);
  };

  const changePhoto = (direction: number) => {
    if (selectedIndex < 0 || availablePhotos.length < 2) return;

    const nextIndex = (selectedIndex + direction + availablePhotos.length) % availablePhotos.length;
    setSelectedId(availablePhotos[nextIndex].id);
  };

  return (
    <main ref={rootRef} className="relative min-h-svh bg-[#000000] text-[#F5F0DE] [font-family:var(--font-gotham-book)]">
      <section className={`relative flex flex-col px-4 pt-8 min-[900px]:px-12 min-[900px]:pt-28 ${browsing ? "min-h-svh pb-[calc(110px+env(safe-area-inset-bottom))]" : "h-svh min-h-[540px] pb-[calc(88px+env(safe-area-inset-bottom))] min-[900px]:pb-8"}`}>
        <header className="mx-auto flex w-full max-w-[1160px] min-[900px]:max-w-[900px] shrink-0 flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 text-[8px] tracking-[0.2em] text-[#8DDCFA] [font-family:var(--font-pixel)] min-[900px]:text-[10px]">
              MOMENTS
            </p>

            <h1 className="text-[clamp(2.3rem,7vw,5rem)] leading-none tracking-[-0.04em] [font-family:var(--font-gotham-bold)]">
              GALLERY
            </h1>
          </div>

          {!reducedMotion && (
            <button
              type="button"
              onClick={() => setManualBrowse((value) => !value)}
              aria-pressed={manualBrowse}
              className="min-h-11 border border-white/25 px-4 py-2 text-[10px] [font-family:var(--font-gotham-bold)] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8DDCFA] min-[900px]:text-xs"
            >
              {browsing ? "Play animation" : "Browse photos"}
            </button>
          )}
        </header>

        {browsing ? (
          <div className="mx-auto mt-8 grid w-full max-w-[1160px] min-[900px]:max-w-[900px] grid-cols-2 gap-3 min-[900px]:grid-cols-3 min-[900px]:gap-4">
            {galleryPhotos.map((photo, index) => (
              <PhotoTile key={photo.id} photo={photo} index={index} onOpen={openPhoto} />
            ))}
          </div>
        ) : (
          <div
            ref={viewportRef}
            aria-label="Moving gallery. Use Browse photos for a stationary view."
            className="relative mx-auto mt-6 w-full max-w-[1160px] min-[900px]:max-w-[900px] min-h-0 flex-1 overflow-hidden min-[900px]:mt-8"
          >
            <div className="grid grid-cols-3 items-start gap-2 min-[600px]:gap-3 min-[900px]:gap-4">
              {columns.map((photos, columnIndex) => {
                // Repeat enough photos to cover the moving viewport.
                const repeatedPhotos = photos.length
                  ? Array.from({ length: Math.max(1, Math.ceil(6 / photos.length)) }, () => photos).flat()
                  : [];

                return (
                  <div key={columnIndex} data-column-track className="relative min-w-0 will-change-transform">
                    {[0, 1].map((copyIndex) => (
                      <div key={copyIndex} data-column-group className="flex flex-col gap-2 pb-2 min-[600px]:gap-3 min-[600px]:pb-3 min-[900px]:gap-4 min-[900px]:pb-4">
                        {repeatedPhotos.map((photo, photoIndex) => (
                          <div key={`${copyIndex}-${photo.id}-${photoIndex}`} data-photo-slot className="relative min-w-0">
                            <PhotoTile
                              photo={photo}
                              index={galleryPhotos.findIndex((item) => item.id === photo.id)}
                              duplicate={copyIndex > 0 || photoIndex >= photos.length}
                              onOpen={openPhoto}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-50 h-6 bg-gradient-to-b from-[#101014] to-transparent min-[900px]:h-12" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-50 h-8 bg-gradient-to-t from-[#101014] to-transparent min-[900px]:h-14" />
          </div>
        )}
      </section>

      <dialog
        ref={dialogRef}
        aria-label="Gallery photo viewer"
        data-lenis-prevent
        onClose={() => setSelectedId(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelectedId(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            changePhoto(1);
          }

          if (event.key === "ArrowLeft") {
            event.preventDefault();
            changePhoto(-1);
          }
        }}
        className="fixed inset-0 m-auto h-[min(88dvh,960px)] max-h-none w-[94vw] max-w-[1400px] overflow-hidden border border-white/15 bg-[#101014] p-0 text-[#F5F0DE] backdrop:bg-black/90"
      >
        {selectedPhoto && (
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center justify-between gap-5 border-b border-white/10 px-4 py-3 min-[900px]:px-6">
              <p className="text-xs leading-relaxed">
                {selectedPhoto.caption}
              </p>

              <button type="button" autoFocus onClick={() => setSelectedId(null)} aria-label="Close photo" className="flex h-11 w-11 shrink-0 items-center justify-center text-2xl focus-visible:outline-2 focus-visible:outline-[#8DDCFA]">
                ×
              </button>
            </div>

            <div className="relative min-h-0 flex-1">
              <Image src={selectedPhoto.image} alt={selectedPhoto.alt} fill sizes="94vw" className="object-contain p-3 min-[900px]:p-6" />
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-3 min-[900px]:px-6">
              <button type="button" disabled={availablePhotos.length < 2} onClick={() => changePhoto(-1)} className="min-h-11 px-3 text-xs disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#8DDCFA]">
                ← Previous
              </button>

              <span className="text-[10px] text-white/50 [font-family:var(--font-pixel)]">
                {selectedIndex + 1} / {availablePhotos.length}
              </span>

              <button type="button" disabled={availablePhotos.length < 2} onClick={() => changePhoto(1)} className="min-h-11 px-3 text-xs disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#8DDCFA]">
                Next →
              </button>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}