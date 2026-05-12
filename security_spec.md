# Security Specification for Mobile Shop Attendance & Payroll

## Data Invariants
- An attendance record must contain a valid employee name from the authorized list.
- An attendance record's timestamp must match the server time exactly.
- Payroll records can only be calculated for existing employees.
- Only authenticated users can submit attendance (though for this specific request, it might be a public kiosk or an authenticated employee device). Given the use case, I'll assume users are authenticated with Google login.

## The "Dirty Dozen" Payloads (Denial Tests)
1. **Identity Spoofing**: Attempt to submit attendance with another user's ID in the payload.
2. **Timestamp Forgery**: Attempt to submit a backdated or future attendance record.
3. **Empty Selfie**: Attempt to submit check-in without the mandatory selfie data.
4. **Massive Payload**: Attempt to inject 2MB of junk into the selfie field (limit should be ~1MB).
5. **Unauthorized Field Injection**: Attempt to set `isVerified: true` on an attendance record.
6. **Orphaned Attendance**: Attempt to submit attendance for a non-existent employee.
7. **Payroll Modification**: A regular employee trying to update their own payroll `totalSalary`.
8. **Malicious ID**: Using a 2KB string as a document ID.
9. **State Shortcut**: Changing payroll status from 'paid' back to 'draft'.
10. **Query Scraping**: Attempting to list all attendance records without proper role/ownership.
11. **PII Leak**: Non-admin accessing employee private details (if added later).
12. **Recursive Cost Attack**: Making complex nested queries.

## The Test Runner (firestore.rules.test.ts)
(I will implement tests later if needed, but for now I'll focus on the rules).
