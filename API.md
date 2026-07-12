# API Dokumentacja - Parlament Młodych RP

## Spis treści
1. Auth API
2. Sessions API
3. Voting API
4. Resolutions API
5. Amendments API
6. Parliamentarians API
7. Clubs API
8. Speakers API
9. WebSocket Voting Live

---

## Auth API

### POST /api/auth/login

Logowanie użytkownika.

#### Request body
```json
{
  "username": "TEST123",
  "password": "password123"
}
```

#### Success response (200 OK)
```json
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "username": "TEST123",
    "name": "Jan Kowalski",
    "role": "admin",
    "permissions": ["MANAGE_VOTINGS"]
  }
}
```

#### Role
- admin - Koordynator Główny, IT
- marshal - Marszałek Parlamentu
- member - Parlamentarzysta

#### Error response (401 Unauthorized)
```json
{
  "message": "Nieprawidłowy login lub hasło"
}
```

---

### GET /api/auth/me

Pobranie informacji o aktualnie zalogowanym użytkowniku.

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
{
  "id": 1,
  "username": "TEST123",
  "name": "Jan Kowalski",
  "role": "admin",
  "club": "KLUB PARLAMENTARNY CZAS MŁODYCH",
  "permissions": ["MANAGE_VOTINGS"]
}
```

#### Error response (401 Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

---

## Sessions API

### GET /api/session/current

Pobranie aktualnie trwającego posiedzenia.

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
{
  "title": "III POSIEDZENIE PARLAMENTU",
  "date": "08.07.2026",
  "status": "TRWA",
  "currentSpeaker": {
    "name": "Jan Kowalski",
    "club": "Klub Parlamentarny Czas Młodych",
    "role": "Parlamentarzysta",
    "time": "12:45"
  },
  "currentPoint": {
    "number": "2",
    "title": "Debata nad ustawą o cyfryzacji administracji",
    "type": "Dyskusja"
  },
  "schedule": [
    { "time": "10:00", "title": "Otwarcie posiedzenia", "status": "done" },
    { "time": "10:30", "title": "Sprawozdanie komisji", "status": "done" },
    { "time": "12:00", "title": "Debata nad ustawą o cyfryzacji administracji", "status": "active" },
    { "time": "14:00", "title": "Głosowania", "status": "waiting" }
  ]
}
```

#### No active session response (200 OK)
```json
{
  "message": "Brak aktywnego posiedzenia"
}
```

#### Error response (401 Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

---

### PUT /api/session/current

Aktualizacja danych sesji (tylko admin/marszałek).

#### Request headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request body
```json
{
  "title": "III POSIEDZENIE PARLAMENTU",
  "date": "08.07.2026",
  "status": "TRWA",
  "currentSpeaker": {
    "name": "Jan Kowalski",
    "club": "Klub Parlamentarny Czas Młodych",
    "role": "Parlamentarzysta",
    "time": "12:45"
  },
  "currentPoint": {
    "number": "2",
    "title": "Debata nad ustawą o cyfryzacji administracji",
    "type": "Dyskusja"
  },
  "schedule": [
    { "time": "10:00", "title": "Otwarcie posiedzenia", "status": "done" },
    { "time": "10:30", "title": "Sprawozdanie komisji", "status": "done" },
    { "time": "12:00", "title": "Debata nad ustawą o cyfryzacji administracji", "status": "active" },
    { "time": "14:00", "title": "Głosowania", "status": "waiting" }
  ]
}
```

#### Success response (200 OK)
```json
{
  "title": "III POSIEDZENIE PARLAMENTU",
  "date": "08.07.2026",
  "status": "TRWA",
  "currentSpeaker": {
    "name": "Jan Kowalski",
    "club": "Klub Parlamentarny Czas Młodych",
    "role": "Parlamentarzysta",
    "time": "12:45"
  },
  "currentPoint": {
    "number": "2",
    "title": "Debata nad ustawą o cyfryzacji administracji",
    "type": "Dyskusja"
  },
  "schedule": [
    { "time": "10:00", "title": "Otwarcie posiedzenia", "status": "done" },
    { "time": "10:30", "title": "Sprawozdanie komisji", "status": "done" },
    { "time": "12:00", "title": "Debata nad ustawą o cyfryzacji administracji", "status": "active" },
    { "time": "14:00", "title": "Głosowania", "status": "waiting" }
  ]
}
```

#### Error response (403 Forbidden)
```json
{
  "message": "Brak uprawnień do zarządzania sesją"
}
```

---

## Voting API

### GET /api/votings

Pobranie listy wszystkich głosowań.

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
[
  {
    "id": 1,
    "title": "Uchwała w sprawie zwiększenia finansowania oświaty",
    "description": "Projekt uchwały dotyczący zwiększenia środków przeznaczonych na edukację.",
    "category": "resolution",
    "startTime": "2026-07-10T16:19:00",
    "endTime": "2026-07-10T22:00:00",
    "status": "active",
    "recipientsType": "all",
    "selectedGroups": [],
    "selectedMembers": [],
    "linkedItemType": "none",
    "linkedItemId": "",
    "applicant": "marshal",
    "votesFor": 142,
    "votesAgainst": 87,
    "abstained": 12,
    "hasVoted": true,
    "myVote": "for",
    "createdBy": "Jan Kowalski",
    "managers": [3]
  }
]
```

---

### GET /api/votings/:id

Pobranie szczegółów głosowania.

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
{
  "id": 1,
  "title": "Uchwała w sprawie zwiększenia finansowania oświaty",
  "category": "Poprawka",
  "description": "Projekt zakłada zwiększenie budżetu oświaty o 15% w roku budżetowym 2026.",
  "startTime": "2026-07-06T16:50:00Z",
  "endTime": "2026-07-06T16:53:00Z",
  "status": "active",
  "hasVoted": false,
  "myVote": null,
  "canSeeLiveResults": false
}
```

#### Success response (200 OK) — z widocznymi wynikami live
```json
{
  "id": 1,
  "title": "Uchwała w sprawie zwiększenia finansowania oświaty",
  "category": "Poprawka",
  "description": "Projekt zakłada zwiększenie budżetu oświaty o 15% w roku budżetowym 2026.",
  "startTime": "2026-07-06T16:50:00Z",
  "endTime": "2026-07-06T16:53:00Z",
  "status": "active",
  "hasVoted": false,
  "myVote": null,
  "canSeeLiveResults": true,
  "liveResults": {
    "for": 142,
    "against": 87,
    "abstain": 12,
    "voted": 241,
    "notVoted": 59,
    "total": 300
  }
}
```

#### Error response (404 Not Found)
```json
{
  "message": "Nie znaleziono głosowania"
}
```

---

### POST /api/votings/:id/vote

Oddanie głosu w głosowaniu.

#### Request headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request body
```json
{
  "vote": "for"
}
```

Możliwe wartości:
- for - ZA
- against - PRZECIW
- abstain - WSTRZYMANIE

#### Success response (200 OK)
```json
{
  "message": "Głos został zapisany",
  "vote": "for"
}
```

#### Error response (400 Bad Request)
```json
{
  "message": "Użytkownik już oddał głos"
}
```

#### Error response (404 Not Found)
```json
{
  "message": "Nie znaleziono głosowania"
}
```

---

### POST /api/votings

Tworzenie nowego głosowania (tylko admin/marszałek).

#### Request headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request body
```json
{
  "title": "Uchwała w sprawie zwiększenia finansowania oświaty",
  "description": "Projekt uchwały dotyczący zwiększenia środków przeznaczonych na edukację.",
  "category": "resolution",
  "startTime": "2026-07-10T16:19:00",
  "endTime": "2026-07-10T22:00:00",
  "recipientsType": "all",
  "selectedGroups": [],
  "selectedMembers": [],
  "linkedItemType": "none",
  "linkedItemId": "",
  "applicant": "marshal",
  "managers": [],
  "quorumRequired": 50,
  "majorityType": "simple",
  "allowAbstain": true,
  "isAnonymous": false,
  "requireComment": false,
  "canChangeVote": false,
  "showResultsDuringVoting": false,
  "notifyEmail": false,
  "notifyPush": false
}
```

#### Success response (200 OK)
```json
{
  "id": 1,
  "title": "Uchwała w sprawie zwiększenia finansowania oświaty",
  "description": "Projekt uchwały dotyczący zwiększenia środków przeznaczonych na edukację.",
  "category": "resolution",
  "startTime": "2026-07-10T16:19:00",
  "endTime": "2026-07-10T22:00:00",
  "status": "active",
  "recipientsType": "all",
  "selectedGroups": [],
  "selectedMembers": [],
  "linkedItemType": "none",
  "linkedItemId": "",
  "applicant": "marshal",
  "votesFor": 0,
  "votesAgainst": 0,
  "abstained": 0,
  "hasVoted": false,
  "myVote": null,
  "createdBy": "Jan Kowalski",
  "managers": []
}
```

---

### PUT /api/votings/:id

Edycja głosowania (tylko admin/marszałek).

#### Request headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request body
```json
{
  "title": "Uchwała w sprawie zwiększenia finansowania oświaty",
  "description": "Projekt uchwały dotyczący zwiększenia środków przeznaczonych na edukację.",
  "category": "resolution",
  "startTime": "2026-07-10T16:19:00",
  "endTime": "2026-07-10T22:00:00",
  "recipientsType": "all",
  "selectedGroups": [],
  "selectedMembers": [],
  "linkedItemType": "none",
  "linkedItemId": "",
  "applicant": "marshal"
}
```

#### Success response (200 OK)
```json
{
  "success": true,
  "message": "Głosowanie zostało zaktualizowane",
  "voting": {
    "id": 1,
    "title": "Uchwała w sprawie zwiększenia finansowania oświaty",
    "description": "Projekt uchwały dotyczący zwiększenia środków przeznaczonych na edukację.",
    "category": "resolution",
    "startTime": "2026-07-10T16:19:00",
    "endTime": "2026-07-10T22:00:00",
    "status": "active",
    "recipientsType": "all",
    "selectedGroups": [],
    "selectedMembers": [],
    "linkedItemType": "none",
    "linkedItemId": "",
    "applicant": "marshal",
    "votesFor": 0,
    "votesAgainst": 0,
    "abstained": 0,
    "hasVoted": false,
    "myVote": null,
    "createdBy": "Jan Kowalski"
  }
}
```

---

### DELETE /api/votings/:id

Usunięcie głosowania (tylko admin/marszałek).

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
{
  "success": true
}
```

---

### POST /api/votings/:id/archive

Archiwizacja głosowania (tylko admin/marszałek).

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
{
  "success": true,
  "message": "Głosowanie zostało zarchiwizowane"
}
```

---

### POST /api/votings/:id/activate

Aktywacja głosowania (tylko admin/marszałek).

#### Request headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request body
```json
{
  "startTime": "2026-07-10T16:19:00",
  "endTime": "2026-07-10T22:00:00",
  "duration": 2,
  "delay": 0
}
```

#### Success response (200 OK)
```json
{
  "success": true,
  "message": "Głosowanie zostało aktywowane",
  "voting": {
    "id": 1,
    "title": "Uchwała w sprawie zwiększenia finansowania oświaty",
    "startTime": "2026-07-10T16:19:00",
    "endTime": "2026-07-10T22:00:00",
    "status": "active"
  }
}
```

---

## Resolutions API

### GET /api/resolutions

Pobranie listy uchwał.

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
{
  "session": {
    "city": "Warszawa",
    "date": "20.05"
  },
  "resolutions": [
    {
      "id": 1,
      "title": "Uchwała w sprawie rozwoju kompetencji cyfrowych młodzieży",
      "slug": "rozwoj-kompetencji-cyfrowych-mlodziezy",
      "fileName": "uchwala-kompetencje-cyfrowe.docx",
      "authorId": 2,
      "author": "Anna Nowak",
      "party": "KLUB PARLAMENTARNY CZAS MŁODYCH",
      "preamble": "Uchwała dotycząca wspierania edukacji cyfrowej młodzieży.",
      "status": "accepted",
      "createdAt": "2026-07-09",
      "signatures": 3
    }
  ]
}
```

---

### GET /api/resolutions/:slug

Pobranie szczegółów uchwały.

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
{
  "resolution": {
    "id": 1,
    "title": "Uchwała w sprawie rozwoju kompetencji cyfrowych młodzieży",
    "slug": "rozwoj-kompetencji-cyfrowych-mlodziezy",
    "fileName": "uchwala-kompetencje-cyfrowe.docx",
    "authorId": 2,
    "author": "Anna Nowak",
    "party": "KLUB PARLAMENTARNY CZAS MŁODYCH",
    "preamble": "Uchwała dotycząca wspierania edukacji cyfrowej młodzieży.",
    "chapters": [
      {
        "id": "ch_1",
        "title": "Rozdział I – Przepisy ogólne",
        "articles": [
          {
            "id": "art_1",
            "number": "Art. 1",
            "content": "Uchwała określa zasady wspierania kompetencji cyfrowych młodzieży."
          }
        ]
      }
    ],
    "status": "accepted",
    "createdAt": "2026-07-09",
    "signatures": 3
  },
  "signedUsers": [
    {
      "name": "Jan Kowalski",
      "club": "TEST",
      "timestamp": "2026-07-09T10:00:00Z",
      "type": "author"
    }
  ],
  "session": {
    "city": "Warszawa",
    "date": "20.05"
  },
  "currentUser": {
    "hasSigned": true,
    "isAuthor": false,
    "signatureType": "signature"
  }
}
```

---

### POST /api/resolutions

Tworzenie nowej uchwały.

#### Request headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request body
```json
{
  "title": "Uchwała w sprawie rozwoju kompetencji cyfrowych młodzieży",
  "fileName": "uchwala-kompetencje-cyfrowe.docx",
  "authorId": 2,
  "author": "Anna Nowak",
  "party": "KLUB PARLAMENTARNY CZAS MŁODYCH",
  "preamble": "Uchwała dotycząca wspierania edukacji cyfrowej młodzieży.",
  "chapters": [
    {
      "id": "ch_1",
      "title": "Rozdział I – Przepisy ogólne",
      "articles": [
        {
          "id": "art_1",
          "number": "Art. 1",
          "content": "Uchwała określa zasady wspierania kompetencji cyfrowych młodzieży."
        }
      ]
    }
  ]
}
```

#### Success response (200 OK)
```json
{
  "id": 1,
  "title": "Uchwała w sprawie rozwoju kompetencji cyfrowych młodzieży",
  "slug": "rozwoj-kompetencji-cyfrowych-mlodziezy",
  "fileName": "uchwala-kompetencje-cyfrowe.docx",
  "authorId": 2,
  "author": "Anna Nowak",
  "party": "KLUB PARLAMENTARNY CZAS MŁODYCH",
  "preamble": "Uchwała dotycząca wspierania edukacji cyfrowej młodzieży.",
  "chapters": [
    {
      "id": "ch_1",
      "title": "Rozdział I – Przepisy ogólne",
      "articles": [
        {
          "id": "art_1",
          "number": "Art. 1",
          "content": "Uchwała określa zasady wspierania kompetencji cyfrowych młodzieży."
        }
      ]
    }
  ],
  "signatures": 1,
  "status": "pending",
  "createdAt": "2026-07-09T10:00:00Z"
}
```

---

### POST /api/resolutions/:id/sign

Podpisanie uchwały.

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
{
  "success": true
}
```

#### Error response (400 Bad Request)
```json
{
  "message": "Już podpisałeś tę uchwałę"
}
```

---

### DELETE /api/resolutions/:id/sign

Usunięcie podpisu z uchwały.

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
{
  "success": true,
  "message": "Podpis został usunięty"
}
```

#### Error response (403 Forbidden)
```json
{
  "message": "Autor nie może usunąć podpisu"
}
```

---

## Amendments API

### GET /api/amendments

Pobranie listy poprawek.

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
[
  {
    "id": 1,
    "resolutionId": 1,
    "title": "Poprawka do uchwały oświatowej",
    "author": "Anna Nowak",
    "content": "Proponuję zmianę w artykule 2 dotyczącą zwiększenia budżetu na szkolenia z kompetencji cyfrowych z 500 tys. zł do 1 mln zł.",
    "status": "pending",
    "createdAt": "2026-07-10",
    "withdrawnReason": null,
    "changes": [
      {
        "articleId": 1,
        "before": "Przeznacza się kwotę 500 000 zł na szkolenia z kompetencji cyfrowych.",
        "after": "Przeznacza się kwotę 1 000 000 zł na szkolenia z kompetencji cyfrowych."
      }
    ]
  }
]
```

---

### GET /api/amendments/:id

Pobranie szczegółów poprawki.

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
{
  "data": {
    "id": 1,
    "resolutionId": 1,
    "title": "Poprawka do uchwały oświatowej",
    "author": "Anna Nowak",
    "content": "Proponuję zmianę w artykule 2 dotyczącą zwiększenia budżetu na szkolenia z kompetencji cyfrowych z 500 tys. zł do 1 mln zł.",
    "status": "pending",
    "createdAt": "2026-07-10",
    "withdrawnReason": null,
    "changes": [
      {
        "articleId": 1,
        "before": "Przeznacza się kwotę 500 000 zł na szkolenia z kompetencji cyfrowych.",
        "after": "Przeznacza się kwotę 1 000 000 zł na szkolenia z kompetencji cyfrowych."
      }
    ],
    "resolution": {
      "id": 1,
      "title": "Uchwała w sprawie finansowania oświaty",
      "slug": "finansowanie-oswiaty"
    }
  }
}
```

---

### POST /api/amendments/:id/withdraw

Wycofanie poprawki (tylko autor).

#### Request headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request body
```json
{
  "reason": "Brak poparcia wśród członków komisji"
}
```

#### Success response (200 OK)
```json
{
  "success": true,
  "amendment": {
    "id": 1,
    "resolutionId": 1,
    "author": "Anna Nowak",
    "content": "Proponuję zmianę w artykule 2 dotyczącą zwiększenia budżetu na szkolenia z kompetencji cyfrowych z 500 tys. zł do 1 mln zł.",
    "status": "withdrawn",
    "createdAt": "2026-07-10",
    "withdrawnReason": "Brak poparcia wśród członków komisji",
    "changes": []
  }
}
```

---

### GET /api/resolutions/:slug/amendments

Pobranie poprawek dla danej uchwały.

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
{
  "resolution": {
    "title": "Uchwała w sprawie finansowania oświaty",
    "slug": "finansowanie-oswiaty"
  },
  "session": {
    "city": "Warszawa",
    "date": "20.05"
  },
  "amendments": [
    {
      "id": 1,
      "resolutionId": 1,
      "author": "Anna Nowak",
      "content": "Proponuję zmianę w artykule 2 dotyczącą zwiększenia budżetu na szkolenia z kompetencji cyfrowych z 500 tys. zł do 1 mln zł.",
      "status": "pending",
      "createdAt": "2026-07-10",
      "withdrawnReason": null,
      "changes": []
    }
  ]
}
```

---

### POST /api/resolutions/:slug/amendments

Dodanie poprawki do uchwały.

#### Request headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request body
```json
{
  "author": "Anna Nowak",
  "authorId": 2,
  "club": "KLUB PARLAMENTARNY CZAS MŁODYCH",
  "content": "Proponuję zmianę w artykule 2 dotyczącą zwiększenia budżetu na szkolenia z kompetencji cyfrowych z 500 tys. zł do 1 mln zł.",
  "changes": [
    {
      "articleId": 1,
      "before": "Przeznacza się kwotę 500 000 zł na szkolenia z kompetencji cyfrowych.",
      "after": "Przeznacza się kwotę 1 000 000 zł na szkolenia z kompetencji cyfrowych."
    }
  ]
}
```

#### Success response (200 OK)
```json
{
  "success": true,
  "amendment": {
    "id": 1,
    "resolutionId": 1,
    "author": "Anna Nowak",
    "authorId": 2,
    "club": "KLUB PARLAMENTARNY CZAS MŁODYCH",
    "content": "Proponuję zmianę w artykule 2 dotyczącą zwiększenia budżetu na szkolenia z kompetencji cyfrowych z 500 tys. zł do 1 mln zł.",
    "status": "pending",
    "createdAt": "2026-07-10",
    "withdrawnReason": null,
    "changes": [
      {
        "articleId": 1,
        "before": "Przeznacza się kwotę 500 000 zł na szkolenia z kompetencji cyfrowych.",
        "after": "Przeznacza się kwotę 1 000 000 zł na szkolenia z kompetencji cyfrowych."
      }
    ]
  }
}
```

---

## Parliamentarians API

### GET /api/parliamentarians

Pobranie listy parlamentarzystów.

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
{
  "parliamentarians": [
    {
      "id": 1,
      "firstName": "Jan",
      "lastName": "Kowalski",
      "clubId": 1,
      "clubName": "Platforma Obywatelska",
      "clubColor": "#1a73e8",
      "functions": ["Przewodniczący"],
      "commissions": ["Komisja Finansów"]
    }
  ],
  "unaffiliated": [
    {
      "id": 4,
      "firstName": "Maria",
      "lastName": "Kowalska",
      "clubId": null,
      "clubName": null,
      "clubColor": null,
      "functions": [],
      "commissions": []
    }
  ]
}
```

---

### POST /api/parliamentarians

Dodanie nowego parlamentarzysty (tylko admin).

#### Request headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request body
```json
{
  "firstName": "Jan",
  "lastName": "Kowalski",
  "clubId": 1,
  "functions": ["Przewodniczący"],
  "commissions": ["Komisja Finansów"]
}
```

#### Success response (200 OK)
```json
{
  "id": 1,
  "firstName": "Jan",
  "lastName": "Kowalski",
  "clubId": 1,
  "clubName": "Platforma Obywatelska",
  "clubColor": "#1a73e8",
  "functions": ["Przewodniczący"],
  "commissions": ["Komisja Finansów"]
}
```

---

### PUT /api/parliamentarians/:id

Edycja parlamentarzysty (tylko admin).

#### Request headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request body
```json
{
  "firstName": "Jan",
  "lastName": "Kowalski",
  "clubId": 2,
  "functions": ["Przewodniczący", "Członek"],
  "commissions": ["Komisja Finansów", "Komisja Edukacji"]
}
```

#### Success response (200 OK)
```json
{
  "id": 1,
  "firstName": "Jan",
  "lastName": "Kowalski",
  "clubId": 2,
  "clubName": "Prawo i Sprawiedliwość",
  "clubColor": "#dc143c",
  "functions": ["Przewodniczący", "Członek"],
  "commissions": ["Komisja Finansów", "Komisja Edukacji"]
}
```

---

### DELETE /api/parliamentarians/:id

Usunięcie parlamentarzysty (tylko admin).

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
{
  "success": true
}
```

---

## Clubs API

### GET /api/clubs

Pobranie listy klubów.

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
[
  {
    "id": 1,
    "name": "Platforma Obywatelska",
    "type": "klub",
    "color": "#1a73e8",
    "members": [
      {
        "id": 1,
        "firstName": "Jan",
        "lastName": "Kowalski",
        "functions": ["Przewodniczący"],
        "commissions": ["Komisja Finansów"]
      }
    ]
  }
]
```

---

### POST /api/clubs

Dodanie nowego klubu (tylko admin).

#### Request headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request body
```json
{
  "name": "Nowy Klub",
  "type": "klub",
  "color": "#00ff00"
}
```

#### Success response (200 OK)
```json
{
  "id": 4,
  "name": "Nowy Klub",
  "type": "klub",
  "color": "#00ff00",
  "members": []
}
```

---

### PUT /api/clubs/:id

Edycja klubu (tylko admin).

#### Request headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request body
```json
{
  "name": "Nowa Nazwa Klubu",
  "type": "koło",
  "color": "#ff0000"
}
```

#### Success response (200 OK)
```json
{
  "id": 4,
  "name": "Nowa Nazwa Klubu",
  "type": "koło",
  "color": "#ff0000",
  "members": []
}
```

---

### DELETE /api/clubs/:id

Usunięcie klubu (tylko admin).

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
{
  "success": true
}
```

---

### POST /api/clubs/:id/members

Dodanie członka do klubu (tylko admin).

#### Request headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request body
```json
{
  "memberId": 1
}
```

#### Success response (200 OK)
```json
{
  "club": {
    "id": 1,
    "name": "Platforma Obywatelska",
    "type": "klub",
    "color": "#1a73e8",
    "members": [
      {
        "id": 1,
        "firstName": "Jan",
        "lastName": "Kowalski",
        "functions": ["Przewodniczący"],
        "commissions": ["Komisja Finansów"]
      }
    ]
  },
  "parliamentarians": [
    {
      "id": 1,
      "firstName": "Jan",
      "lastName": "Kowalski",
      "clubId": 1,
      "clubName": "Platforma Obywatelska",
      "clubColor": "#1a73e8",
      "functions": ["Przewodniczący"],
      "commissions": ["Komisja Finansów"]
    }
  ],
  "unaffiliated": []
}
```

---

### DELETE /api/clubs/:id/members/:memberId

Usunięcie członka z klubu (tylko admin).

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
{
  "club": {
    "id": 1,
    "name": "Platforma Obywatelska",
    "type": "klub",
    "color": "#1a73e8",
    "members": []
  },
  "parliamentarians": [],
  "unaffiliated": [
    {
      "id": 1,
      "firstName": "Jan",
      "lastName": "Kowalski",
      "clubId": null,
      "clubName": null,
      "clubColor": null,
      "functions": ["Przewodniczący"],
      "commissions": ["Komisja Finansów"]
    }
  ]
}
```

---

## Speakers API

### GET /api/speakers

Pobranie listy mówców.

#### Request headers
```
Authorization: Bearer <jwt_token>
```

#### Success response (200 OK)
```json
[
  {
    "name": "Jan Kowalski",
    "club": "Klub Parlamentarny Czas Młodych",
    "role": "Parlamentarzysta"
  },
  {
    "name": "Anna Nowak",
    "club": "Klub Obywatelski",
    "role": "Parlamentarzystka"
  },
  {
    "name": "Piotr Wiśniewski",
    "club": "Klub Niezależnych",
    "role": "Parlamentarzysta"
  }
]
```

---

### POST /api/speakers

Dodanie nowego mówcy (tylko admin/marszałek).

#### Request headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request body
```json
{
  "name": "Marcin Adamcewicz",
  "club": "Koordynatorzy",
  "role": "Koordynator Główny"
}
```

#### Success response (200 OK)
```json
{
  "id": 4,
  "name": "Marcin Adamcewicz",
  "club": "Koordynatorzy",
  "role": "Koordynator Główny"
}
```

---

## WebSocket Voting Live

### Connection

Po wejściu na stronę głosowania frontend łączy się z WebSocketem:

```
ws://server/api/votings/:id/live
```

Użytkownik wysyła token JWT podczas połączenia.

#### Example
```
Authorization: Bearer <jwt_token>
```

### Event: VOTE_UPDATE

Wysyłany przez backend po każdym oddanym głosie.

Dostępny tylko dla użytkowników z rolą:
- admin
- marshal

#### Example
```json
{
  "type": "VOTE_UPDATE",
  "data": {
    "for": 143,
    "against": 87,
    "abstain": 12,
    "voted": 242,
    "notVoted": 58,
    "total": 300
  }
}
```