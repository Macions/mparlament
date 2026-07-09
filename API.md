# API Auth

## POST /api/auth/login

Logowanie użytkownika.

### Request body

Frontend wysyła:

```json
{
	"username": "TEST123",
	"password": "password123"
}
```


### Succes response (example)
```json
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "username": "TEST123",
    "role": "admin"
  }
}
```
Role:

- `admin` — Koordynator Główny, IT
- `marshal` — Marszałek Parlamentu
- `member` — Parlamentarzysta

### Error response (example)
```json
{
  "message": "Nieprawidłowy login lub hasło"
}
```


## GET /api/auth/me

Pobranie informacji o aktualnie zalogowanym użytkowniku na podstawie tokena JWT.

### Request headers

```http
Authorization: Bearer <jwt_token>
```

### Success response (example)

```json
{
  "id": 1,
  "username": "jkowalski",
  "name": "Jan Kowalski",
  "role": "admin",
  "club": "KLUB PARLAMENTARNY CZAS MŁODYCH"
}
```

Role:

- `admin` — Koordynator Główny, IT
- `marshal` — Marszałek Parlamentu
- `member` — Parlamentarzysta

### Error response (example)

```json
{
  "message": "Unauthorized"
}
```

# API Sessions

## GET /api/sessions/current

Pobranie aktualnie trwającego posiedzenia.

### Request headers

```http
Authorization: Bearer <jwt_token>
```

### Success response (example)




### No active session response (example)

```json
{
  "message": "Brak aktywnego posiedzenia"
}
```

### Error response (example)

```json
{
  "message": "Unauthorized"
}
```

# API Voting

## GET /api/votings/:id

Pobranie szczegółów głosowania.

Dostęp wymaga zalogowania użytkownika.

### Request headers

Authorization: Bearer <jwt_token>

### Success response - member (example)
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
### Success response - admin / marshal (example)

Dla użytkowników z rolą admin lub marshal odpowiedź zawiera dodatkowo aktualne wyniki głosowania.
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

### Role

- admin — Koordynator Główny, IT
- marshal — Marszałek Parlamentu
- member — Parlamentarzysta

Backend decyduje o zwracanych danych na podstawie roli użytkownika z tokena JWT.

---

## POST /api/votings/:id/vote

Oddanie głosu w głosowaniu.

### Request headers

Authorization: Bearer <jwt_token>

### Request body
```json
{
  "vote": "for"
}
```

Możliwe wartości:
- for — ZA
- against — PRZECIW
- abstain — WSTRZYMANIE

### Success response (example)
```json
{
  "message": "Głos został zapisany",
  "vote": "for"
}
```

### Error response (example)
```json
{
  "message": "Użytkownik już oddał głos"
}
```

---

# WebSocket Voting Live

## Connection

Po wejściu na stronę głosowania frontend łączy się z WebSocketem:

ws://server/api/votings/:id/live

Użytkownik wysyła token JWT podczas połączenia.

Przykład:

Authorization: Bearer <jwt_token>

## Event: VOTE_UPDATE

Wysyłany przez backend po każdym oddanym głosie.

Dostępny tylko dla użytkowników z rolą:
- admin
- marshal

### Example

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