/* ------------------------------------------------------------------
   André & Anke - SweetAlert2 in die troue-tema
   Eucalyptus-groen, ivoor, skerp hoeke, Cormorant Garamond en Jost.
   Val stil terug na die blaaier se eie dialoë as die CDN geblokkeer is.
   Geen em-strepe. Afrikaans.
------------------------------------------------------------------ */

const BASIESE_KLASSE = {
  popup: "aa-swal",
  title: "aa-swal-title",
  htmlContainer: "aa-swal-body",
  confirmButton: "aa-swal-confirm",
  cancelButton: "aa-swal-cancel"
};

export function swalBeskikbaar(){
  return typeof window !== "undefined" && typeof window.Swal !== "undefined";
}

function basis(opsies){
  return Object.assign({
    customClass: BASIESE_KLASSE,
    buttonsStyling: false,
    showClass: { popup: "" },
    hideClass: { popup: "" },
    heightAuto: false,
    scrollbarPadding: false
  }, opsies);
}

function eyebrowHtml(eyebrow, teks){
  const kop = eyebrow ? `<div class="aa-swal-eyebrow">${eyebrow}</div>` : "";
  return `${kop}<div>${teks}</div><div class="aa-swal-rule"></div>`;
}

export function wysSukses(titel, teks, eyebrow){
  if(!swalBeskikbaar()){ window.alert(titel + "\n\n" + teks.replace(/<[^>]*>/g, "")); return Promise.resolve(); }
  return window.Swal.fire(basis({
    icon: "success",
    title: titel,
    html: eyebrowHtml(eyebrow || "Dankie", teks),
    confirmButtonText: "Toemaar, dankie"
  }));
}

export function wysFout(titel, teks){
  if(!swalBeskikbaar()){ window.alert(titel + "\n\n" + teks.replace(/<[^>]*>/g, "")); return Promise.resolve(); }
  return window.Swal.fire(basis({
    icon: "error",
    title: titel,
    html: eyebrowHtml("Ai tog", teks),
    confirmButtonText: "Probeer weer"
  }));
}

export function wysInfo(titel, teks){
  if(!swalBeskikbaar()){ window.alert(titel + "\n\n" + teks.replace(/<[^>]*>/g, "")); return Promise.resolve(); }
  return window.Swal.fire(basis({
    icon: "info",
    title: titel,
    html: eyebrowHtml("Let wel", teks),
    confirmButtonText: "Goed"
  }));
}

export async function vraBevestig(titel, teks, bevestigTeks){
  if(!swalBeskikbaar()){
    return window.confirm(titel + "\n\n" + teks.replace(/<[^>]*>/g, ""));
  }
  const r = await window.Swal.fire(basis({
    icon: "warning",
    title: titel,
    html: eyebrowHtml("Bevestig asseblief", teks),
    showCancelButton: true,
    confirmButtonText: bevestigTeks || "Ja, verwyder",
    cancelButtonText: "Kanselleer",
    focusCancel: true
  }));
  return !!r.isConfirmed;
}

export function wysBesig(titel){
  if(!swalBeskikbaar()) return;
  window.Swal.fire(basis({
    title: titel || "Besig...",
    html: eyebrowHtml("Net 'n oomblik", "Ons stoor jou antwoord."),
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => window.Swal.showLoading()
  }));
}

export function maakToe(){
  if(swalBeskikbaar()) window.Swal.close();
}

export { basis as swalBasis };
