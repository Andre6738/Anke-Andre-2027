/* ------------------------------------------------------------------
   André & Anke - SweetAlert2 in die troue-tema
   Eucalyptus-groen, ivoor, skerp hoeke, Cormorant Garamond en Jost.
   Val stil terug na die blaaier se eie dialoë as die CDN geblokkeer is.

   Die gaste-bladsy gebruik die Afrikaanse verstek-etikette hieronder.
   Die admin-portaal roep stelEtikette() met Engelse etikette, want die
   admin-kontroles is in Engels. Elke bladsy laai sy eie module-kopie,
   so die twee tale beïnvloed mekaar nie.
   Geen em-strepe.
------------------------------------------------------------------ */

const BASIESE_KLASSE = {
  popup: "aa-swal",
  title: "aa-swal-title",
  htmlContainer: "aa-swal-body",
  confirmButton: "aa-swal-confirm",
  cancelButton: "aa-swal-cancel"
};

const ETIKETTE = {
  suksesEyebrow: "Dankie",
  suksesKnoppie: "Toemaar, dankie",
  foutEyebrow: "Ai tog",
  foutKnoppie: "Probeer weer",
  infoEyebrow: "Let wel",
  infoKnoppie: "Goed",
  bevestigEyebrow: "Bevestig asseblief",
  bevestigKnoppie: "Ja, verwyder",
  kanselleerKnoppie: "Kanselleer",
  besigEyebrow: "Net 'n oomblik",
  besigTeks: "Ons stoor jou antwoord."
};

export function stelEtikette(nuwes){
  Object.assign(ETIKETTE, nuwes || {});
}

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

function platTeks(t){ return String(t).replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, ""); }

export function wysSukses(titel, teks, eyebrow){
  if(!swalBeskikbaar()){ window.alert(titel + "\n\n" + platTeks(teks)); return Promise.resolve(); }
  return window.Swal.fire(basis({
    icon: "success",
    title: titel,
    html: eyebrowHtml(eyebrow || ETIKETTE.suksesEyebrow, teks),
    confirmButtonText: ETIKETTE.suksesKnoppie
  }));
}

export function wysFout(titel, teks){
  if(!swalBeskikbaar()){ window.alert(titel + "\n\n" + platTeks(teks)); return Promise.resolve(); }
  return window.Swal.fire(basis({
    icon: "error",
    title: titel,
    html: eyebrowHtml(ETIKETTE.foutEyebrow, teks),
    confirmButtonText: ETIKETTE.foutKnoppie
  }));
}

export function wysInfo(titel, teks){
  if(!swalBeskikbaar()){ window.alert(titel + "\n\n" + platTeks(teks)); return Promise.resolve(); }
  return window.Swal.fire(basis({
    icon: "info",
    title: titel,
    html: eyebrowHtml(ETIKETTE.infoEyebrow, teks),
    confirmButtonText: ETIKETTE.infoKnoppie
  }));
}

export async function vraBevestig(titel, teks, bevestigTeks){
  if(!swalBeskikbaar()){
    return window.confirm(titel + "\n\n" + platTeks(teks));
  }
  const r = await window.Swal.fire(basis({
    icon: "warning",
    title: titel,
    html: eyebrowHtml(ETIKETTE.bevestigEyebrow, teks),
    showCancelButton: true,
    confirmButtonText: bevestigTeks || ETIKETTE.bevestigKnoppie,
    cancelButtonText: ETIKETTE.kanselleerKnoppie,
    focusCancel: true
  }));
  return !!r.isConfirmed;
}

export function wysBesig(titel){
  if(!swalBeskikbaar()) return;
  window.Swal.fire(basis({
    title: titel || "Besig...",
    html: eyebrowHtml(ETIKETTE.besigEyebrow, ETIKETTE.besigTeks),
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
