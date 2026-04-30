const fs = require('fs');

const localePaths = {
  en: 'C:/Users/yazilimciemir/Desktop/hair-dresser-new-frontend-main/app/i18n/locales/en.json',
  de: 'C:/Users/yazilimciemir/Desktop/hair-dresser-new-frontend-main/app/i18n/locales/de.json',
  ar: 'C:/Users/yazilimciemir/Desktop/hair-dresser-new-frontend-main/app/i18n/locales/ar.json',
};

const translations = {
  backendAppointmentCancellationReasonTooLong: {
    en: 'Cancellation reason can be at most 500 characters.',
    de: 'Der Stornierungsgrund darf höchstens 500 Zeichen lang sein.',
    ar: 'يمكن أن يكون سبب الإلغاء بحد أقصى 500 حرف.',
  },
  backendFreeBarberPanelRequired: {
    en: 'You must create your free barber panel first to create an appointment.',
    de: 'Um einen Termin zu erstellen, musst du zuerst dein Freier-Friseur-Panel erstellen.',
    ar: 'لإنشاء موعد، يجب عليك أولاً إنشاء لوحة الحلاق المستقل الخاصة بك.',
  },
  backendServiceOfferingUsedInPackages: {
    en: 'This service is used in one or more packages. Remove it from related packages or update those packages first.',
    de: 'Dieser Service wird in einem oder mehreren Paketen verwendet. Entferne ihn zuerst aus den betroffenen Paketen oder aktualisiere diese Pakete.',
    ar: 'هذه الخدمة مستخدمة في حزمة واحدة أو أكثر. أزلها أولاً من الحزم المرتبطة أو حدّث تلك الحزم.',
  },
  backendAccountDeleteBlockedByActiveAppointments: {
    en: 'You cannot delete your account while you have pending or approved appointments. Complete, cancel, or wait for them to conclude first.',
    de: 'Du kannst dein Konto nicht löschen, solange du ausstehende oder bestätigte Termine hast. Schließe sie ab, storniere sie oder warte auf deren Abschluss.',
    ar: 'لا يمكنك حذف حسابك أثناء وجود مواعيد قيد الانتظار أو معتمدة. أكملها أو ألغها أو انتظر حتى تنتهي أولاً.',
  },
  backendUserBlockedCannotDecideAppointment: {
    en: 'Due to blocking, you cannot approve or reject this appointment.',
    de: 'Aufgrund einer Sperre kannst du diesen Termin nicht bestätigen oder ablehnen.',
    ar: 'بسبب الحظر، لا يمكنك قبول هذا الموعد أو رفضه.',
  },
  backendFavoriteRequiredToSend: {
    en: 'You must add this person to your favorites to send messages.',
    de: 'Du musst diese Person zu deinen Favoriten hinzufügen, um Nachrichten senden zu können.',
    ar: 'يجب إضافة هذا الشخص إلى المفضلة لديك حتى تتمكن من إرسال الرسائل.',
  },
  backendFavoriteRequiredToReadMessages: {
    en: 'You must add this person to your favorites to view messages.',
    de: 'Du musst diese Person zu deinen Favoriten hinzufügen, um Nachrichten sehen zu können.',
    ar: 'يجب إضافة هذا الشخص إلى المفضلة لديك لعرض الرسائل.',
  },
  backendThreadRestrictedNoFavorite: {
    en: 'Add the other person to your favorites to access this conversation.',
    de: 'Füge die andere Person zu deinen Favoriten hinzu, um auf diese Unterhaltung zuzugreifen.',
    ar: 'أضف الطرف الآخر إلى المفضلة لديك للوصول إلى هذه المحادثة.',
  },
  backendFreeBarberNotAvailableCannotDeletePanel: {
    en: 'You cannot delete your panel while unavailable. Mark yourself as available first.',
    de: 'Du kannst dein Panel nicht löschen, solange du nicht verfügbar bist. Markiere dich zuerst als verfügbar.',
    ar: 'لا يمكنك حذف لوحتك عندما تكون غير متاح. قم بتعيين نفسك كمتاح أولاً.',
  },
  backendCategoryAddedSuccess: {
    en: 'Category added.',
    de: 'Kategorie hinzugefügt.',
    ar: 'تمت إضافة الفئة.',
  },
  backendCategoryDeletedSuccess: {
    en: 'Category deleted.',
    de: 'Kategorie gelöscht.',
    ar: 'تم حذف الفئة.',
  },
  backendCategoriesRetrieved: {
    en: 'Categories retrieved.',
    de: 'Kategorien abgerufen.',
    ar: 'تم جلب الفئات.',
  },
  backendUploadFileRequired: {
    en: 'File is empty or was not provided.',
    de: 'Datei ist leer oder wurde nicht übermittelt.',
    ar: 'الملف فارغ أو لم يتم إرساله.',
  },
  backendUploadOnlyImagesAllowed: {
    en: 'Only image files are accepted for profile and gallery uploads.',
    de: 'Für Profil- und Galerie-Uploads sind nur Bilddateien erlaubt.',
    ar: 'يُسمح فقط بملفات الصور في رفع صور الملف الشخصي والمعرض.',
  },
  backendUserBannedWithReason: {
    en: 'Your account has been suspended. Reason: {0}',
    de: 'Dein Konto wurde gesperrt. Grund: {0}',
    ar: 'تم تعليق حسابك. السبب: {0}',
  },
  backendUserBannedSuccess: {
    en: 'User banned successfully.',
    de: 'Benutzer erfolgreich gesperrt.',
    ar: 'تم حظر المستخدم بنجاح.',
  },
  backendUserUnbannedSuccess: {
    en: 'User unbanned successfully.',
    de: 'Benutzersperre erfolgreich aufgehoben.',
    ar: 'تم رفع حظر المستخدم بنجاح.',
  },
  backendServicePackageNotFound: {
    en: 'Service package not found.',
    de: 'Servicepaket nicht gefunden.',
    ar: 'لم يتم العثور على باقة الخدمة.',
  },
  backendServicePackageLimitReached: {
    en: 'You can add up to 20 service packages.',
    de: 'Du kannst maximal 20 Servicepakete hinzufügen.',
    ar: 'يمكنك إضافة ما يصل إلى 20 باقة خدمة.',
  },
  backendServicePackageDuplicateServices: {
    en: 'A package with the same services already exists. Add at least one different service.',
    de: 'Ein Paket mit denselben Services existiert bereits. Füge mindestens einen anderen Service hinzu.',
    ar: 'توجد بالفعل باقة تحتوي على نفس الخدمات. أضف خدمة مختلفة واحدة على الأقل.',
  },
  backendServicePackageHasActiveAppointments: {
    en: 'This package cannot be deleted/updated because it has active or pending appointments.',
    de: 'Dieses Paket kann nicht gelöscht/aktualisiert werden, da es aktive oder ausstehende Termine hat.',
    ar: 'لا يمكن حذف/تحديث هذه الباقة لوجود مواعيد نشطة أو قيد الانتظار مرتبطة بها.',
  },
  backendServicePackageAddedSuccess: {
    en: 'Service package added successfully.',
    de: 'Servicepaket erfolgreich hinzugefügt.',
    ar: 'تمت إضافة باقة الخدمة بنجاح.',
  },
  backendServicePackageUpdatedSuccess: {
    en: 'Service package updated successfully.',
    de: 'Servicepaket erfolgreich aktualisiert.',
    ar: 'تم تحديث باقة الخدمة بنجاح.',
  },
  backendServicePackageDeletedSuccess: {
    en: 'Service package deleted successfully.',
    de: 'Servicepaket erfolgreich gelöscht.',
    ar: 'تم حذف باقة الخدمة بنجاح.',
  },
  backendServicePackageServiceNotFound: {
    en: 'Some of the selected services were not found.',
    de: 'Einige der ausgewählten Services wurden nicht gefunden.',
    ar: 'لم يتم العثور على بعض الخدمات المحددة.',
  },
  backendServicePackageModifiedByAnotherProcess: {
    en: 'The service package was updated or deleted by another process. Please refresh and try again.',
    de: 'Das Servicepaket wurde von einem anderen Prozess aktualisiert oder gelöscht. Bitte aktualisiere die Liste und versuche es erneut.',
    ar: 'تم تحديث باقة الخدمة أو حذفها بواسطة عملية أخرى. يرجى تحديث القائمة والمحاولة مرة أخرى.',
  },
  backendServicePackageOrServiceRequired: {
    en: 'For an appointment, either service(s) or package(s) must be selected, but not both.',
    de: 'Für einen Termin müssen entweder Services oder Pakete ausgewählt werden, jedoch nicht beides gleichzeitig.',
    ar: 'للموعد يجب اختيار خدمات أو باقات، وليس الاثنين معاً.',
  },
  backendServicePackageOverlapsSelectedServices: {
    en: 'One of the selected packages overlaps with a separately selected service. A package may only include services you did not select individually.',
    de: 'Eines der ausgewählten Pakete überschneidet sich mit einem zusätzlich ausgewählten Service. Ein Paket darf nur Services enthalten, die nicht einzeln ausgewählt wurden.',
    ar: 'إحدى الباقات المحددة تتداخل مع خدمة قمت بتحديدها بشكل منفصل. يجب أن تحتوي الباقة فقط على الخدمات غير المحددة منفردة.',
  },
  backendServicePackageConflictingServices: {
    en: 'Some selected packages contain overlapping services. You cannot select multiple packages that include the same service.',
    de: 'Einige ausgewählte Pakete enthalten überlappende Services. Mehrere Pakete mit demselben Service können nicht gleichzeitig ausgewählt werden.',
    ar: 'بعض الباقات المحددة تحتوي على خدمات متداخلة. لا يمكن اختيار أكثر من باقة تحتوي على نفس الخدمة.',
  },
  backendServicePackageOwnerMismatch: {
    en: 'Selected packages do not belong to this user.',
    de: 'Ausgewählte Pakete gehören nicht zu diesem Benutzer.',
    ar: 'الباقات المحددة لا تعود لهذا المستخدم.',
  },
  backendServiceOfferingOrPackageRequired: {
    en: 'At least one service or package must be selected.',
    de: 'Es muss mindestens ein Service oder Paket ausgewählt werden.',
    ar: 'يجب اختيار خدمة واحدة على الأقل أو باقة واحدة.',
  },
  backendSavedFilterNameAlreadyExists: {
    en: 'A saved filter with this name already exists.',
    de: 'Ein gespeicherter Filter mit diesem Namen existiert bereits.',
    ar: 'يوجد بالفعل فلتر محفوظ بهذا الاسم.',
  },
  backendSavedFilterCriteriaAlreadyExists: {
    en: 'A saved filter with the same criteria already exists.',
    de: 'Ein gespeicherter Filter mit denselben Kriterien existiert bereits.',
    ar: 'يوجد بالفعل فلتر محفوظ بنفس المعايير.',
  },
  backendSavedFilterNotOwner: {
    en: 'You do not have permission to edit this filter.',
    de: 'Du hast keine Berechtigung, diesen Filter zu bearbeiten.',
    ar: 'ليس لديك صلاحية تعديل هذا الفلتر.',
  },
  backendSavedFilterInvalidCriteriaJson: {
    en: 'Saved filter data is invalid.',
    de: 'Gespeicherte Filterdaten sind ungültig.',
    ar: 'بيانات الفلتر المحفوظ غير صالحة.',
  },
};

function main() {
  for (const [lang, p] of Object.entries(localePaths)) {
    const json = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!json.errors) continue;
    let updated = 0;
    for (const [k, t] of Object.entries(translations)) {
      if (t[lang]) {
        json.errors[k] = t[lang];
        updated += 1;
      }
    }
    fs.writeFileSync(p, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
    console.log(`${lang}: updated ${updated} keys`);
  }
}

main();
