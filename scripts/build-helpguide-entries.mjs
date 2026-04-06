import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "app", "i18n", "locales", "hg");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const merge = (a, b, c) => ({ ...a, ...b, ...c });

const customerEn = {
  hg_c_01: {
    title: "App layout and discovery",
    description:
      "From the main panel you browse nearby barber shops and freelance barbers who are visible on the map or in lists. Bottom tabs work the same for every role: Appointments centralizes every booking and its status; Messages lists conversations only when there is an active favorite link; Favorites keeps saved shops and barbers; Profile contains account settings, language, complaints, requests and blocked users. The header bell opens your notification feed—tap an entry to open the related appointment when the app can resolve it.",
  },
  hg_c_02: {
    title: "Location permission and browsing",
    description:
      "Nearby results need foreground location. After you allow it, you can open a shop or freelance card to see address, hours, services, pricing model hints and start booking. If you deny location, some lists may stay empty until you enable permission from system settings. Distance rules still apply when a freelance barber must be within range of a selected shop.",
  },
  hg_c_03: {
    title: "Two-party appointments",
    description:
      "When you book directly with one shop or one freelance barber, only two sides are involved: you and that provider. Approvals, rejections, cancellations and completion flow between those two parties. Push and in-app notifications tell you when your action is required. The Appointments tab shows the same timeline with buttons you are allowed to use at each state.",
  },
  hg_c_04: {
    title: "Three-party appointments (you + freelance + shop)",
    description:
      "Use this path when a freelance barber will serve you inside a shop chair. You create the customer-side request; the barber picks an eligible shop, chair and time window; the shop owner accepts or declines the chair usage. Later steps can include final confirmations from you or timeouts if someone does not answer in time. Each step generates its own notification type so you always know whether the shop, the barber or you must respond next.",
  },
  hg_c_05: {
    title: "Shop selection modes: Custom vs Shop pick",
    description:
      'Some flows let the freelance barber choose how the shop enters the story. “According to my request” starts lean—often just you and the barber until a shop is actually needed. “Pick a shop” means the barber commits to a specific business, usually with a note, and the three-party approval chain begins earlier. The booking form explains which mode applies before you confirm.',
  },
  hg_c_06: {
    title: "Appointment statuses explained",
    description:
      "Pending: waiting for required approvals. Approved: locked schedule. Rejected or Cancelled: someone refused or withdrew. Unanswered: a timeout ran out without a decision. Completed: service finished; you may rate the relevant party. Always read the subtitle on the card because the next button you see depends on that state and your role in the appointment.",
  },
  hg_c_07: {
    title: "Notifications vs appointment actions",
    description:
      "Notifications mirror almost everything that also appears on the appointment card: creation, approval, rejection, cancellation, reminders, three-party intermediate steps (shop accepting a chair proposal, freelance declining first, customer final approval, selection timeouts, etc.). Use the bell for a chronological history and the Appointments tab when you need contextual buttons. Keeping push enabled is strongly recommended so timed steps are not missed.",
  },
  hg_c_08: {
    title: "How favorites unlock messaging",
    description:
      "Adding a shop or freelance barber to favorites creates (or revives) the chat thread in Messages. Sending new messages requires the favorite relationship to stay active on both sides’ rules. Removing a favorite breaks the messaging channel until you favorite again. This protects inboxes from unsolicited contact.",
  },
  hg_c_09: {
    title: "Messages tab behaviour",
    description:
      "You only see threads that stem from favorites. Inside a thread you can jump to profiles, review linked appointments and share media when the feature is enabled. If either side blocks the other, messaging stops immediately and further booking attempts may also be blocked by policy.",
  },
  hg_c_10: {
    title: "Choosing chair, time and services",
    description:
      "Shop bookings ask you to pick a free chair and slot. If the shop uses a percentage commission model you must select at least one priced service so totals are known. Hourly rent shops may allow empty service lines but the duration still determines rent math. Overlaps with other bookings or closing hours are blocked server-side.",
  },
  hg_c_11: {
    title: "Ratings after completion",
    description:
      "Once a visit is marked completed, rate the appropriate party with stars and optional text. Skipping is allowed but feedback helps everyone. Cancelled or rejected appointments close without a rating step unless the product later adds partial surveys.",
  },
  hg_c_12: {
    title: "Shared customer number",
    description:
      "Phone numbers can host multiple role accounts (customer, freelance, shop). Those roles share one customer number for support and matching. Keep each profile accurate because staff may reference that number when helping you across roles.",
  },
  hg_c_13: {
    title: "Complaints, requests and blocked users",
    description:
      "Profile houses administrative tools: file complaints, send operational requests and review blocked accounts. Blocking is bidirectional for messaging and may affect booking eligibility with that person or business. Use these tools instead of venting inside chats when you need a formal trail.",
  },
  hg_c_14: {
    title: "Voice assistant and microphone",
    description:
      "The floating menu exposes the AI appointment assistant. It may ask for microphone access to capture your intent. The assistant guides you conversationally but legally binding actions still happen through the normal booking UI. Denying the mic only disables voice capture—you can still type.",
  },
};

const fbEn = {
  hg_fb_01: {
    title: "Panel, visibility and availability",
    description:
      "Your panel controls live location, availability flags and public profile data. Customers only discover you when you are online/available according to the rules. Background location—if you granted it—updates proximity under distance and timing rules and may show a persistent Android notification. Keep certificates, photos and services current to convert searches into bookings.",
  },
  hg_fb_02: {
    title: "Direct two-party bookings with customers",
    description:
      "When a customer books you alone, approvals, rejections, cancellations and completion are between the two of you. Notifications mirror every required action. Use Appointments to batch-manage multiple simultaneous states.",
  },
  hg_fb_03: {
    title: "Three-party flows",
    description:
      "After the customer starts a request you must pick a compliant shop, chair and slot. The shop owner then accepts or declines chair usage. Further customer confirmations or automated timeouts may follow. Distinct notification types tell you whether you, the shop or the customer must move next.",
  },
  hg_fb_04: {
    title: "Customer booking: custom vs shop-first",
    description:
      "“According to my request” keeps the shop out until business rules require one. “Pick a shop” binds you early to a specific salon, usually with a note, and starts the triple approval chain immediately. Distance checks still apply between you and that business.",
  },
  hg_fb_05: {
    title: "Your own chair booking at a shop",
    description:
      "You can block a chair without an end customer when you need workspace. The shop still validates the slot. Service lines may be optional under hourly rent shops but mandatory under percentage shops—mirror what the customer would have paid so revenue shares stay fair.",
  },
  hg_fb_06: {
    title: "Statuses and timeouts",
    description:
      "Pending means someone still owes a decision. Unanswered highlights expired timers. Rejections at your first step or at the shop selection stage emit different notifications so everyone understands who broke the chain. Completed unlocks earnings views for eligible appointments.",
  },
  hg_fb_07: {
    title: "Notification hygiene",
    description:
      "Enable push: three-party chains stall if one party misses a deadline. The bell history helps when you need proof of what happened. Reminders nudge you to mark visits complete when appropriate.",
  },
  hg_fb_08: {
    title: "Favorites power messaging",
    description:
      "Customers message you only through the favorite channel. If they remove you, outbound messaging pauses until they favorite again. Watch your favorite count as a proxy for inbox eligibility.",
  },
  hg_fb_09: {
    title: "Earnings and pricing models",
    description:
      "On percentage shops your net equals service sum minus the shop’s configured percent. On hourly rent shops subtract duration × hourly rent from the service sum (floored at zero). Direct customer jobs without a shop keep the full service total. Analytics screens aggregate completed appointments only.",
  },
  hg_fb_10: {
    title: "Subscription health",
    description:
      "Freelance accounts depend on trial or paid plans. Expired or banned states restrict panel usage—visit the subscription screen from profile when prompted.",
  },
  hg_fb_11: {
    title: "Foreground vs background location",
    description:
      "Foreground updates power discovery while the app is active. Background updates require extra OS permission and respect battery policies; disable either if you temporarily want privacy, knowing customers may stop seeing you.",
  },
  hg_fb_12: {
    title: "Profile quality",
    description:
      "High-resolution photos, accurate service list and honest availability reduce disputes and cancellations.",
  },
  hg_fb_13: {
    title: "Voice assistant",
    description:
      "Use the assistant for hands-free navigation; microphone permission is optional. Confirm critical choices on screen.",
  },
  hg_fb_14: {
    title: "Complaints and blocks",
    description:
      "Formal issues go through profile tools. Blocking is mutual for messaging and may prevent future bookings with that entity.",
  },
};

const stEn = {
  hg_st_01: {
    title: "Shop control center",
    description:
      "Manage branding, hours, chairs, manual barbers, service catalog and pricing mode from one panel. Customer bookings and freelance chair requests surface in the same Appointments tab with filters by source when available.",
  },
  hg_st_02: {
    title: "Chairs and manual barbers",
    description:
      "Each chair has its own calendar. Manual barber records help customers understand who serves them but automated overlap checks still run on the chair entity. Delete or pause chairs you truly retire to avoid ghost availability.",
  },
  hg_st_03: {
    title: "Percentage (commission) pricing",
    description:
      "You declare a percent fee. Every completed appointment must include at least one priced service so the commission base is real. Your revenue share is that percentage of the service total; the freelance barber keeps the remainder before tips.",
  },
  hg_st_04: {
    title: "Hourly rent pricing",
    description:
      "You declare an hourly rent. For each completed visit multiply appointment length (end − start) by that rate and subtract it from the service total (never below zero). Services might be optional but documenting them still helps transparency.",
  },
  hg_st_05: {
    title: "Two-party customer visits",
    description:
      "Pure shop-customer bookings involve only you and the client. You control approvals, rejections and completion inside the same card UI customers see.",
  },
  hg_st_06: {
    title: "Freelance chair bookings",
    description:
      "Freelancers can request chairs for their own clients or for three-party chains. You always validate chair ownership and hours. Declining should include a reason in notes when the app provides the field so the other parties understand next steps.",
  },
  hg_st_07: {
    title: "Your role in three-party chains",
    description:
      "After a freelance barber selects your chair you confirm or deny. Subsequent customer confirmations or timeouts are tracked separately. Watch notification copy—it tells you if you are waiting on the customer or the freelancer.",
  },
  hg_st_08: {
    title: "Operational statuses",
    description:
      "Pending, approved, rejected, cancelled, unanswered and completed map to the same customer-facing vocabulary. Use consistent actions so ratings and payouts stay fair.",
  },
  hg_st_09: {
    title: "Notifications",
    description:
      "You receive every state transition that touches your chairs: new requests, approvals you owe, freelance declines, customer finals and reminders.",
  },
  hg_st_10: {
    title: "Messaging and favorites",
    description:
      "Messaging opens only for mutual favorites. Enforce your house rules inside chat professionally; escalate conflicts via complaints instead of arguing in-thread.",
  },
  hg_st_11: {
    title: "Earnings reporting",
    description:
      "Dashboards sum completed appointments. Percent mode shows commission accrual; rent mode shows hourly deductions. Cross-check against your bank payouts externally.",
  },
  hg_st_12: {
    title: "Subscription compliance",
    description:
      "Shops also depend on subscription state. Renew early to avoid discovery drops.",
  },
  hg_st_13: {
    title: "Profile accuracy",
    description:
      "Photos, geo pin and hours should mirror reality to reduce “unanswered” timeouts caused by customers hesitating.",
  },
  hg_st_14: {
    title: "Complaints & requests",
    description:
      "Use profile forms for operational tickets; attach appointment IDs when possible for faster support.",
  },
};

// --- Arabic (customer full; fb/store detailed) ---
const customerAr = {
  hg_c_01: {
    title: "تخطيط التطبيق والاستكشاف",
    description:
      "من اللوحة الرئيسية تستعرض صالونات الحلاقة القريبة والحلاقين الأحرار الظاهرين على الخريطة أو في القوائم. علامات التبويب السفلية متشابهة لكل الأدوار: المواعيد تجمع كل الحجوزات وحالاتها؛ الرسائل تعرض المحادثات فقط عند وجود مفضلة نشطة؛ المفضلة تحفظ المتاجر والحلاقين؛ الملف الشخصي يحتوي الإعدادات واللغة والشكاوى والطلبات والمحظورين. جرس التنبيهات يفتح سجل الإشعارات ويمكن الضغط للانتقال إلى الموعد إن أمكن.",
  },
  hg_c_02: {
    title: "إذن الموقع والتصفح",
    description:
      "نتائج القرب تحتاج موقع المقدمة. بعد السماح تفتح بطاقة المتجر أو الحلاق لرؤية العنوان والساعات والخدمات وبدء الحجز. عند الرفض قد تبقى بعض القوائم فارغة حتى تفعيل الإذن من إعدادات النظام. قواعد المسافة ما زالت تنطبق عندما يجب أن يكون الحلاق ضمن نطاق المتجر المختار.",
  },
  hg_c_03: {
    title: "مواعيد طرفان",
    description:
      "عند الحجز مباشرة مع متجر أو حلاق حر واحد يشارك طرفان فقط: أنت ومقدم الخدمة. الموافقة والرفض والإلغاء والإتمام تتم بينكما. التنبيهات الفورية وداخل التطبيق تخبرك عند الحاجة لإجراء. تبويب المواعيد يعرض نفس الخط الزمني مع الأزرار المتاحة لحالتك.",
  },
  hg_c_04: {
    title: "مواعيد ثلاثية (أنت + حلاق + متجر)",
    description:
      "عندما يخدمك الحلاق على كرسي داخل متجر، تنشئ الطلب كعميل؛ يختار الحلاق المتجر والكرسي والوقت؛ يقرر صاحب المتجر قبول أو رفض استخدام الكرسي. قد تتبع خطوات تأكيد نهائية منك أو انتهاء وقت عند التأخر. كل مرحلة لها نوع إشعار ليعرف الجميع من يجب أن يرد الآن.",
  },
  hg_c_05: {
    title: "أنماط اختيار المتجر",
    description:
      "قد يختار الحلاق كيفية دخول المتجر. وفق طلبي يبدأ ببساطة غالباً بينك وبين الحلاق حتى يحتاج متجراً. اختيار متجر يعني ربطاً مبكراً بمتجر محدد وغالباً مع ملاحظة وتبدأ سلسلة الموافقات الثلاثية. النموذج يوضح النمط قبل التأكيد.",
  },
  hg_c_06: {
    title: "حالات الموعد",
    description:
      "قيد الانتظار: بانتظار الموافقات. موافق: جدول ثابت. مرفوض أو ملغى: انسحاب. بلا رد: انتهى الوقت دون قرار. مكتمل: انتهت الخدمة ويمكن التقييم. اقرأ الوصف على البطاقة لأن الزر التالي يعتمد على الحالة ودورك.",
  },
  hg_c_07: {
    title: "التنبيهات والإجراءات",
    description:
      "تعكس التنبيهات ما يظهر على بطاقة الموعد: الإنشاء والموافقة والرفض والإلغاء والتذكير وخطوات الطرف الثلاثة. استخدم الجرس للتاريخ الزمني وتبويب المواعيد للأزرار السياقية. يُنصح بتفعيل الدفع لتفويت المهل.",
  },
  hg_c_08: {
    title: "المفضلة والرسائل",
    description:
      "إضافة متجر أو حلاق للمفضلة تنشئ محادثة في الرسائل. الإرسال يتطلب بقاء المفضلة نشطة وفق القواعد. إزالة المفضلة تقطع القناة حتى تُعاد الإضافة. يحمي ذلك من رسائل غير مرغوبة.",
  },
  hg_c_09: {
    title: "تبويب الرسائل",
    description:
      "ترى فقط سلاسل المفضلة. داخل المحادثة يمكن الانتقال للملفات والمواعيد ومشاركة الوسائط عند التفعيل. الحظر يوقف المراسلة فوراً وقد يقيّد الحجز.",
  },
  hg_c_10: {
    title: "الكرسي والوقت والخدمات",
    description:
      "حجز المتجر يتطلب كرسياً وفترة فارغة. نموذج النسبة يفرض خدمة واحدة على الأقل لحساب الإجمالي. نموذج الإيجار بالساعة قد يسمح بلا خدمات لكن المدة تحدد حساب الإيجار. التعارضات تُمنع من الخادم.",
  },
  hg_c_11: {
    title: "التقييم بعد الإتمام",
    description:
      "بعد الإتمام قيّم الطرف المناسب بالنجوم ونص اختياري. التخطي مسموح لكن الملاحظات مفيدة للجميع.",
  },
  hg_c_12: {
    title: "رقم العميل المشترك",
    description:
      "قد يتعدد الحساب على نفس الهاتف (عميل، حلاق، متجر) ويشاركون رقم عميل للدعم. حافظ على دقة الملفات.",
  },
  hg_c_13: {
    title: "شكاوى وطلبات ومحظورون",
    description:
      "من الملف الشخصي: شكاوى، طلبات، قائمة المحظورين. الحظر قد يؤثر على الحجز والرسائل. استخدمها للمسارات الرسمية.",
  },
  hg_c_14: {
    title: "المساعد الصوتي والمايكروفون",
    description:
      "القائمة العائمة تفتح مساعد المواعيد بالذكاء الاصطناعي وقد يطلب الميكروفون. الإجراءات الملزمة تتم عبر واجهة الحجز العادية.",
  },
};

const fbAr = {
  hg_fb_01: {
    title: "اللوحة والظهور",
    description:
      "تتحكم لوحتك بالموقع الفعلي وحالة التوفر والملف العام. العملاء يرونك عند الالتزام بالقواعد. الموقع في الخلفية يحدّث القرب وفق المسافة والزمن وقد يظهر إشعاراً دائماً على أندرويد. حدّث الصور والخدمات لزيادة الحجوزات.",
  },
  hg_fb_02: {
    title: "موعد مباشر مع عميل",
    description:
      "الموافقة والرفض والإلغاء والإتمام بينك وبين العميل فقط. التنبيهات تعكس كل إجراء مطلوب.",
  },
  hg_fb_03: {
    title: "مسار ثلاثي",
    description:
      "بعد طلب العميل تختار متجراً وكرسياً ووقتاً؛ يقرر صاحب المتجر؛ قد تلزم تأكيدات لاحقة أو مهلة زمنية. أنواع الإشعارات توضح من يجب أن يتحرك الآن.",
  },
  hg_fb_04: {
    title: "نمط اختيار المتجر للعميل",
    description:
      "وفق الطلب يؤخر دخول المتجر حتى يلزم. اختيار متجر يربطك مبكراً بمتجر محدد غالباً مع ملاحظة وتبدأ الموافقات الثلاثية فوراً.",
  },
  hg_fb_05: {
    title: "حجز كرسي بلا عميل نهائي",
    description:
      "يمكن حجز كرسٍ لاحتياجاتك؛ المتجر يتحقق من الفترة. نموذج النسبة قد يفرض خدمات؛ الإيجار بالساعة قد يسمح بغير ذلك.",
  },
  hg_fb_06: {
    title: "الحالات والمهال",
    description:
      "قيد الانتظار يعني قراراً مطلوباً. بلا رد يعني انتهاء المهلة. الارتدادات الأولى تُبلغ بأنواع مختلفة.",
  },
  hg_fb_07: {
    title: "التنبيهات",
    description:
      "فعّل الدفع؛ سلاسل ثلاثية تتعطل عند تفويت مهلة. الجرس يحفظ التاريخ.",
  },
  hg_fb_08: {
    title: "المفضلة والرسائل",
    description:
      "العملاء يتواصلون عبر المفضلة؛ إزالتها توقف الإرسال حتى تُعاد.",
  },
  hg_fb_09: {
    title: "الأرباح والتسعير",
    description:
      "بالنسبة: إجمالي الخدمات ناقص النسبة. بالإيجار: إجمالي الخدمات ناقص الساعات×الإيجار بحد أدنى صفر. بلا متجر يبقى كامل الإجمالي لك.",
  },
  hg_fb_10: {
    title: "الاشتراك",
    description:
      "راقب التجربة أو الخطة المدفوعة من الملف؛ انتهاء الصلاحية أو الحظر يقيّد اللوحة.",
  },
  hg_fb_11: {
    title: "الموقع أمامي/خلفي",
    description:
      "الأمامي للاستخدام النشط؛ الخلفي يحتاج إذناً إضافياً ويحترم البطارية.",
  },
  hg_fb_12: {
    title: "جودة الملف",
    description: "صور وخدمات دقيقة تقلل النزاعات.",
  },
  hg_fb_13: {
    title: "المساعد الصوتي",
    description: "اختياري؛ الميكروفون لالتقاط الصوت والتأكيد يبقى على الشاشة.",
  },
  hg_fb_14: {
    title: "شكاوى وحظر",
    description:
      "استخدم أدوات الملف الرسمية؛ الحظر متبادل وقد يمنع الحجز لاحقاً.",
  },
};

const stAr = {
  hg_st_01: {
    title: "لوحة المتجر",
    description:
      "إدارة العلامة والساعات والكراسي والحلاقين اليدويين وقائمة الخدمات ونمط التسعير. تظهر حجوزات العملاء وطلبات الكراسي للحلاقين الأحرار في تبويب المواعيد.",
  },
  hg_st_02: {
    title: "الكراسي والحلاقون",
    description:
      "لكل كرسٍ تقويمه. سجلات الحلاق اليدوي توضيحية لكن منع التعارض يعتمد على الكرسي. عطّل الكراسي المتوقفة فعلياً.",
  },
  hg_st_03: {
    title: "تسعير بالنسبة",
    description:
      "تحدد نسبة عمولة. يلزم خدمة واحدة على الأقل لكل موعد مكتمل لحساب الأساس.",
  },
  hg_st_04: {
    title: "تسعير بإيجار ساعي",
    description:
      "تحدد إيجاراً بالساعة؛ اضرب مدة الموعد فيه واطرحه من إجمالي الخدمات بحد أدنى صفر.",
  },
  hg_st_05: {
    title: "زيارات عميل مباشرة",
    description:
      "حجوزاتك أنت والعميل فقط؛ تدير الموافقة والرفض والإتمام من نفس البطاقة.",
  },
  hg_st_06: {
    title: "حجوزات كراسٍ للحلاقين",
    description:
      "قد يطلب الحلاق الأحرار كرسياً لعملائهم أو ضمن مسار ثلاثي؛ تتحقق دائماً من ملكية الكرسي والساعات.",
  },
  hg_st_07: {
    title: "دورك في المسار الثلاثي",
    description:
      "بعد اختيار الحلاق لكرسيك تقبل أو ترفض؛ تتبع لاحقاً تأكيدات العميل أو المهل. نص الإشعار يوضح من تنتظر.",
  },
  hg_st_08: {
    title: "حالات التشغيل",
    description:
      "نفس المفردات للعميل: قيد الانتظار، موافق، مرفوض، ملغى، بلا رد، مكتمل.",
  },
  hg_st_09: {
    title: "التنبيهات",
    description: "كل انتقال حالة يمس كراسيك يصلك كإشعار.",
  },
  hg_st_10: {
    title: "الرسائل والمفضلة",
    description:
      "الرسائل للمفضلة المتبادلة فقط؛ ارفع النزاعات عبر الشكاوى الرسمية.",
  },
  hg_st_11: {
    title: "تقارير الأرباح",
    description:
      "لوحات تلخص المواعيد المكتملة؛ النسبة للعمولات والإيجار للخصم الساعي.",
  },
  hg_st_12: {
    title: "الاشتراك",
    description: "تأكد من تجديد الخطة لتفادي إخفاء الظهور.",
  },
  hg_st_13: {
    title: "دقة الملف",
    description:
      "الصور والموقع والساعات يجب أن تعكس الواقع لتقليل المهل الضائعة.",
  },
  hg_st_14: {
    title: "شكاوى وطلبات",
    description: "استخدم نماذج الملف؛ أرفق معرف الموعد عند الإمكان.",
  },
};

const customerDe = {
  hg_c_01: {
    title: "App-Aufbau und Entdecken",
    description:
      "Im Hauptpanel sehen Sie Friseursalons und freie Friseure in der Nähe auf Karte oder Listen. Die unteren Tabs sind für alle Rollen gleich: Termine bündelt alle Buchungen; Nachrichten zeigt nur aktive Favoriten-Threads; Favoriten speichert Shops und Barber; Profil enthält Einstellungen, Sprache, Beschwerden, Anfragen und blockierte Kontakte. Die Glocke öffnet Benachrichtigungen – Tippen springt zum Termin, falls verknüpfbar.",
  },
  hg_c_02: {
    title: "Standortfreigabe",
    description:
      "Näherungslisten brauchen Vordergrund-Standort. Danach öffnen Sie Karten mit Adresse, Öffnungszeiten, Services und Buchungsflow. Ohne Freigabe bleiben Listen leer, bis Sie sie in den Systemeinstellungen aktivieren. Entfernungsregeln gelten weiter, wenn ein freier Friseur nahe am gewählten Salon sein muss.",
  },
  hg_c_03: {
    title: "Zwei-Parteien-Termine",
    description:
      "Direktbuchung bei einem Salon oder einem freien Friseur umfasst nur Sie und diesen Anbieter. Freigaben, Ablehnungen, Stornierungen und Abschluss laufen zwischen diesen beiden Parteien. Push- und In-App-Hinweise zeigen, wenn Sie handeln müssen.",
  },
  hg_c_04: {
    title: "Drei-Parteien-Termine",
    description:
      "Wenn der freie Friseur Sie im Salonstuhl bedient, erstellen Sie die Kundenanfrage; der Friseur wählt Salon, Stuhl und Zeit; der Salonbesitzer entscheidet über die Stuhlnutzung. Es folgen ggf. finale Bestätigungen oder Timeouts. Jeder Schritt hat einen eigenen Benachrichtigungstyp.",
  },
  hg_c_05: {
    title: "Salonwahlmodi",
    description:
      "Nach meinem Bedarf startet schlank, oft nur Sie und der Friseur, bis ein Salon nötig ist. Salon wählen verbindet früh einen konkreten Betrieb oft mit Notiz und startet die Drei-Parteien-Kette. Das Formular zeigt den Modus vor dem Bestätigen.",
  },
  hg_c_06: {
    title: "Terminstatus",
    description:
      "Ausstehend wartet auf Entscheidungen. Genehmigt ist fix. Abgelehnt/Storniert beendet den Flow. Unbeantwortet bedeutet Timeout. Abgeschlossen erlaubt Bewertung. Lesen Sie die Kartenzeile für den nächsten erlaubten Button.",
  },
  hg_c_07: {
    title: "Benachrichtigungen",
    description:
      "Die Glocke spiegelt Kartenereignisse: Erstellung, Freigaben, Ablehnungen, Stornierungen, Erinnerungen und Zwischenschritte bei drei Parteien. Für Aktionen nutzen Sie weiter den Termine-Tab. Push aktiv lassen, damit Fristen nicht verpasst werden.",
  },
  hg_c_08: {
    title: "Favoriten und Chat",
    description:
      "Favoriten legen oder reaktivieren Threads in Nachrichten. Senden setzt eine aktive Favoritenbeziehung voraus. Entfernen trennt den Kanal bis zur erneuten Favorisierung.",
  },
  hg_c_09: {
    title: "Nachrichten-Tab",
    description:
      "Nur Favoriten-Threads erscheinen. Innerhalb können Profile, verknüpfte Termine und Medien genutzt werden. Blockieren stoppt den Chat sofort und kann Buchungen beeinflussen.",
  },
  hg_c_10: {
    title: "Stuhl, Zeit, Services",
    description:
      "Salonbuchungen brauchen freien Stuhl und Slot. Prozent-Modell erzwingt mindestens einen Service. Mietmodell pro Stunde kann ohne Services funktionieren, die Dauer bestimmt aber die Mietrechnung. Überschneidungen blockiert der Server.",
  },
  hg_c_11: {
    title: "Bewertungen",
    description:
      "Nach Abschluss bewerten Sie die passende Partei. Überspringen ist möglich, Feedback hilft aber allen.",
  },
  hg_c_12: {
    title: "Gemeinsame Kundennummer",
    description:
      "Mehrere Rollen pro Telefon teilen sich eine Kundennummer für Support. Profile aktuell halten.",
  },
  hg_c_13: {
    title: "Beschwerden & Sperren",
    description:
      "Profil bündelt Beschwerden, Anfragen und Blocklisten. Sperren wirken auf Chat und ggf. Buchungen.",
  },
  hg_c_14: {
    title: "Sprachassistent",
    description:
      "Schwebendes Menü öffnet den KI-Terminassistenten; Mikrofon kann angefragt werden. Verbindliche Schritte laufen weiter über die normale UI.",
  },
};

const fbDe = {
  hg_fb_01: {
    title: "Panel und Sichtbarkeit",
    description:
      "Steuern Sie Live-Standort, Verfügbarkeit und Profil. Kunden finden Sie nur bei Regelkonformität. Hintergrundstandort aktualisiert Nähe nach Distanz/Zeit und zeigt ggf. eine Android-Dauerbenachrichtigung. Halten Sie Fotos und Services aktuell.",
  },
  hg_fb_02: {
    title: "Direkte Zwei-Parteien-Termine",
    description:
      "Nur Sie und der Kunde steuern Freigaben, Ablehnungen, Stornos und Abschluss. Hinweise spiegeln jeden erforderlichen Schritt.",
  },
  hg_fb_03: {
    title: "Drei-Parteien-Flows",
    description:
      "Nach Kundenstart wählen Sie Salon, Stuhl und Slot; der Salonbesitzer entscheidet; spätere Kundenbestätigungen oder Timeouts folgen. Benachrichtigungstypen zeigen, wer dran ist.",
  },
  hg_fb_04: {
    title: "Salonmodus beim Kunden",
    description:
      "Nach Bedarf verzögert den Salon bis nötig. Salon wählen verpflichtet früh einen Betrieb meist mit Notiz und startet die Dreierkette sofort.",
  },
  hg_fb_05: {
    title: "Eigener Stuhl ohne Endkunden",
    description:
      "Stuhl für eigene Arbeit blockieren; der Salon prüft den Slot. Prozent-Modell kann Services erzwingen; Mietmodell evtl. nicht.",
  },
  hg_fb_06: {
    title: "Status und Timeouts",
    description:
      "Ausstehend wartet auf Entscheidung. Unbeantwortet = Frist abgelaufen. Frühe Ablehnungen haben eigene Meldungen.",
  },
  hg_fb_07: {
    title: "Benachrichtigungen",
    description:
      "Push aktiv lassen; Dreierketten stocken bei verpassten Fristen. Glocke = Historie.",
  },
  hg_fb_08: {
    title: "Favoriten und Chat",
    description:
      "Kunden chatten nur über Favoriten; Entfernen stoppt bis zur erneuten Favorisierung.",
  },
  hg_fb_09: {
    title: "Einnahmen",
    description:
      "Prozent: Summe der Services minus Prozentsatz. Miete: Summe minus Stunden × Miete, nie negativ. Ohne Salon volle Service-Summe.",
  },
  hg_fb_10: {
    title: "Abonnement",
    description:
      "Trial oder Plan im Profil prüfen; abgelaufen oder gesperrt begrenzt das Panel.",
  },
  hg_fb_11: {
    title: "Standort",
    description:
      "Vordergrund für aktive Nutzung; Hintergrund braucht Extra-Recht und schont Batterie.",
  },
  hg_fb_12: {
    title: "Profilqualität",
    description: "Präzise Daten reduzieren Konflikte.",
  },
  hg_fb_13: {
    title: "Sprachassistent",
    description: "Mikrofon optional; kritische Schritte am Bildschirm bestätigen.",
  },
  hg_fb_14: {
    title: "Beschwerden & Block",
    description:
      "Formale Wege im Profil; Block wirkt auf Chat und ggf. Buchungen.",
  },
};

const stDe = {
  hg_st_01: {
    title: "Shop-Dashboard",
    description:
      "Marke, Zeiten, Stühle, manuelle Barber, Services und Preismodell zentral steuern. Kunden- und Freelancer-Anfragen landen im Termine-Tab.",
  },
  hg_st_02: {
    title: "Stühle & manuelle Barber",
    description:
      "Jeder Stuhl hat Kalender. Manuelle Barber dienen der Info, Kollisionen laufen auf Stuhlebene. Inaktive Stühle deaktivieren.",
  },
  hg_st_03: {
    title: "Prozent-Provision",
    description:
      "Prozentsatz festlegen; jeder Abschluss braucht mindestens einen Service als Basis.",
  },
  hg_st_04: {
    title: "Stundenmiete",
    description:
      "Stundensatz × Dauer von der Service-Summe abziehen, nie unter null.",
  },
  hg_st_05: {
    title: "Direkte Kundenbesuche",
    description:
      "Nur Sie und der Kunde; Freigaben im selben UI.",
  },
  hg_st_06: {
    title: "Freelancer-Stuhl",
    description:
      "Freelancer buchen Stühle für ihre Kunden oder Dreierketten; Sie prüfen Besitz und Öffnungszeiten.",
  },
  hg_st_07: {
    title: "Rolle in Dreierketten",
    description:
      "Nach Stuhlwahl durch Freelancer akzeptieren oder ablehnen; später Kunde oder Timeouts. Text der Push sagt, worauf Sie warten.",
  },
  hg_st_08: {
    title: "Betriebsstatus",
    description:
      "Gleiche Begriffe wie beim Kunden für konsistente Bewertungen.",
  },
  hg_st_09: {
    title: "Benachrichtigungen",
    description: "Jede Stuhl-relevante Änderung kommt als Push.",
  },
  hg_st_10: {
    title: "Chat & Favoriten",
    description:
      "Chat nur bei Gegenseitigkeit; Eskalation über Beschwerden.",
  },
  hg_st_11: {
    title: "Umsatzberichte",
    description:
      "Summiert abgeschlossene Termine; Prozent vs. Mietabzug getrennt sichtbar.",
  },
  hg_st_12: {
    title: "Abonnement",
    description: "Rechtzeitig verlängern, Sichtbarkeit zu erhalten.",
  },
  hg_st_13: {
    title: "Profiltreue",
    description:
      "Fotos, Pin und Öffnungszeiten real halten, um Zögerer-Timeouts zu vermeiden.",
  },
  hg_st_14: {
    title: "Tickets",
    description: "Profilformulare nutzen; Termin-IDs angeben.",
  },
};

fs.writeFileSync(
  path.join(dir, "en.entries.json"),
  JSON.stringify(merge(customerEn, fbEn, stEn), null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(dir, "ar.entries.json"),
  JSON.stringify(merge(customerAr, fbAr, stAr), null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(dir, "de.entries.json"),
  JSON.stringify(merge(customerDe, fbDe, stDe), null, 2),
  "utf8",
);

console.log("Wrote en/ar/de entries to", dir);
