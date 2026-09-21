מפרט ממשקים ונתונים (API & Data Contracts)
מסמך זה מגדיר את חוזי העבודה והממשקים בין הלקוח (Client) לשרת (Server) עבור מערכת ניהול התוכן, ומבטיח סנכרון מלא ועבודה מקבילית תקינה בין חברי הצוות.

תקנון פרוטוקול HTTP וניהול שגיאות
בקשות כתיבה: כל בקשת כתיבה (POST, PATCH, DELETE) מחייבת העברת גוף בפורמט JSON יחד עם כותרת אבטחה X-CSRF-Token (הנקראת מתוך רכיב ה-meta במסמך ומנוהלת על ידי DW.api).

הזדהות (Authentication): מתבצעת באמצעות עוגיות HttpOnly. אין להעביר תפקיד (role) או מזהה משתמש (userId) מהדפדפן באופן חשוף.

טיפול בשגיאות: כל חריגה או שגיאה בשרת מחזירה מבנה אחיד:
{ "error": "הסבר מפורט למשתמש" }
בצירוף קוד סטטוס HTTP תקני:

400 – קלט שגוי או חסר.

401 – נדרשת התחברות למערכת.

403 – גישה חסומה / שגיאת אימות CSRF.

404 – הישות המבוקשת לא נמצאה.

409 – התנגשות נתונים או מצב מערכת לא תקין.

429 – חריגה ממגבלת קצב בקשות (Rate Limit).

503 – שירות חיצוני או ספק אינם זמינים.

טיפוסים ופורמטים: כלל המזהים (IDs) במערכת מבוססים על ObjectId של MongoDB. תאריכים וזמנים מועברים כמחרוזות בפורמט ISO. אין להזין קוד JSX או תגיות HTML ישירות לתוך גוף הכתבות.

מודל נתוני כתבה (Article Schema)
מבנה גוף הכתבה:
{ "title": "כותרת", "summary": "תקציר", "body": "פסקה ראשונה\n\nפסקה שנייה", "category": "מדע", "image": "/images/science.svg" }

מחזור חיים וסטטוסים:

שדה ה-draft מכיל את טיוטת העבודה העדכנית ביותר.

שדה ה-published מייצג את הגרסה האחרונה שאושרה ופורסמה רשמית (או null אם טרם פורסמה).

הפיד הציבורי שואב מידע אך ורק מגרסת ה-published ולא ממצב הטיוטה.

פעולות שמירה ומעברי סטטוס מעדכנים את מונה ה-revision. אירועי פרסום (publicationEvents) נרשמים אך ורק בעת אישור סופי של הכתבה ולא בזמן שמירות אוטומטיות (Autosave).

מעברי סטטוס מותרים:

draft -> pending (הגשה לאישור)

returned -> pending (הגשה מחדש לאחר תיקון)

pending -> published (אישור ופרסום על ידי עורך)

pending -> returned (דחיית הכתבה והחזרה לכותב בצירוף הערה)

הערה: עריכת כתבה שכבר פורסמה פותחת מחזור טיוטה חדש תוך שמירה על רציפות גרסת ה-published הקודמת.

מפרט נתיבי ה-REST API
GET /api/articles (ציבורי) - מסנן לפי q, category, seen, sort, page; מחזיר items/count/hasMore.

GET /articles/:id (ציבורי) - HTML עם הגרסה המאושרת; נרשמת צפייה.

GET /api/articles/:id/comments (ציבורי) - page, q; items/hasMore, 20 בכל עמוד.

POST /api/articles/:id/comments (ציבורי + CSRF) - name/body; רשומת התגובה החדשה.

PATCH /api/comments/:id (עורך) - body.

DELETE /api/comments/:id (עורך) - ok.

POST /api/auth/login (ציבורי + CSRF) - username/password; cookie ו-redirect.

POST /api/auth/logout (ציבורי + CSRF) - ביטול session.

GET /api/work/articles (צוות) - q/status/page/mine; items/count/page/hasMore.

POST /api/work/articles (צוות) - יצירת טיוטה בבעלות המשתמש, מחזיר id.

GET /api/work/articles/:id (בעלים או עורך) - המאמר המלא כולל draft/published/revision.

PATCH /api/work/articles/:id (בעלים או עורך) - תוכן כתבה + revision; מחזיר revision/savedAt/status.

POST /api/work/articles/:id/submit (בעלים או עורך) - העברה מ-draft/returned ל-pending.

POST /api/work/articles/:id/review (עורך) - action=publish/return, note בהחזרה.

DELETE /api/work/articles/:id (עורך) - מחיקת כתבה, תגובות ו-stats.

GET /api/users (עורך) - q לפי שם או username, עד 100 תוצאות.

POST /api/users (עורך) - name/username/password/role.

PATCH /api/users/:id (עורך) - name/role/active, password אופציונלי.

DELETE /api/users/:id (עורך) - אסור למחוק את עצמך או משתמש עם כתבות.

GET /api/analytics/:id (עורך) - days=1/7/30; points/events/since/until/total.

POST /api/analytics/:id (עורך) - hour/count; הוספת רשומה שעתית.

PATCH /api/stats/:id (עורך) - count; תיקון רשומה.

DELETE /api/stats/:id (עורך) - מחיקת רשומת צפייה.

GET /api/weather (ציבורי) - temperature/code/observedAt/fetchedAt/city או 503.

הערות התנהגותיות למערכת: הפיד הציבורי מציג אך ורק מידע מאושר. מנגנון החיפוש מבצע התאמת מחרוזת חלקית בכותרת, ומיון הנתונים מבוסס על _id כשובר שוויון אחיד.

מודל סטטיסטיקות צפייה (ViewStat)
שדות עיקריים: article, hour, count.

אגרגציה ואינדוקס:

שדה ה-hour מעוגל לשעה ב-UTC.

מוגדר אינדקס ייחודי (Unique) על article+hour.

איסוף הצפיות משתמש ב-$inc, והגרף משלים שעות ללא רשומות לאפס.

אירועי פרסום מגיעים ממודל Article בלבד.

ממשק צד-לקוח
קובץ write.js מגדיר את DW.writer לפני טעינת review.js. הממשק מכיל pump() להמתנה לשמירה, action(path, body) לשמירה ואחריה פעולה, ורכיבי השליטה מעוגנים ב-views/partials/review-actions.ejs.

סביבת פיתוח והנחיות עבודה מקבילית
npm run preview הוא כלי לסקירת ממשק בלבד, ולא Mock מלא של מערכת אמיתית.

כל מפתח מפעיל MongoDB מקומי נפרד; חל איסור לעבוד על אותו מסד נתונים משותף במהלך פיתוח רגיל.