style.css:
/*==================================================================
	MOBILE-FIRST STYLESHEET

	Base rules target the smallest phones; layout scales up through
	canonical min-width breakpoints:
	  480px  — phone landscape tweaks
	  640px  — side portrait appears (two-column shell)
	  768px  — 2-up services, two-column text blocks
	  1024px — full desktop (35/65 split, magic cursor, snap carousel)
	           mirrored in init.js via matchMedia('(max-width: 1023px)')
	  1700px — 3-up services on extra-wide screens

	Layout tokens (--ip-bar-height, --ip-side-gutter, --ip-layout-max…)
	and header/footer layout live inline in index.html's <head> so the
	first paint is stable before this file loads. The whole layout is
	capped at --ip-layout-max and centered (see index.html).
==================================================================*/

/* Onest (self-hosted; SIL OFL) — weights 300–800, Cyrillic + Latin subsets */

*------------------------------------------------------------------
	TESTIMONIALS
	Base: vertical list (phones, and any layout without room for the
	carousel). Desktop with enough vertical room (or a fine pointer)
	gets the horizontal scroll-snap carousel — the same condition
	ip_use_vertical_testimonials_layout() checks in init.js.
------------------------------------------------------------------*/
/* Horizontal scroll-snap carousel: desktop with vertical room, or any
   desktop-width device driven by a fine pointer. */

/*	SWIPE NAVIGATION (dots built by JS)
	Visible on narrow layouts and on any touch device (.has-touch).*/
/* Dots are decorative indicators, not interactive; no touch-target sizing. */