/** Inline, render-blocking script so the remembered theme applies before first paint. */
/** Default is dark (the brand look); "system" follows the device; "light" is opt-in. */
export const THEME_SCRIPT = `(function(){var t="dark";try{var s=localStorage.getItem("theme");if(s==="light"||s==="dark"||s==="system")t=s}catch(e){}if(t!=="system")document.documentElement.setAttribute("data-theme",t)})()`;
