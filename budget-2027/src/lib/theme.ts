/** Inline, render-blocking script so the remembered theme applies before first paint. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
