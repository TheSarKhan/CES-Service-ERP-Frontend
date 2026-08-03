/** Azerbaijani labels for `permissions.module` catalog values (backend V4 seed). */
export const PERMISSION_MODULE_LABELS: Record<string, string> = {
  VEHICLE: 'Qaraj (Texnika)',
  CUSTOMER: 'Müştərilər',
  SERVICE_REQUEST: 'Servis sorğuları',
  WORK_ORDER: 'İş sifarişləri',
  COST: 'Xərclər',
  ENGINE_HOURS: 'Mühərrik saatları',
  INSPECTION: 'Baxışlar',
  WAREHOUSE: 'Anbar & Ehtiyat hissələri',
  ARCHIVE: 'Arxiv',
  DOCUMENT: 'Sənədlər',
  REPORT: 'Hesabatlar',
  ERP: 'ERP inteqrasiyası',
  BRANCH: 'Filiallar',
  USER: 'İstifadəçilər',
  ROLE: 'Rollar & İcazələr',
  AUDIT: 'Audit qeydləri',
  APPROVAL: 'Təsdiqləmələr',
};

/** Azerbaijani label for a permission module code, falling back to the raw code. */
export function permissionModuleLabel(module: string): string {
  return PERMISSION_MODULE_LABELS[module] ?? module;
}
