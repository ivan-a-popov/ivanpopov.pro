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

