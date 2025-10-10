# API Documentation : Gestion des Relations Agent-Gig avec Statuts

## 📋 Vue d'ensemble

Ce système permet de tracker automatiquement les relations entre les agents et les gigs dans les deux collections (Agent et Gig) avec leurs statuts respectifs.

### Statuts disponibles :
- `invited` - Agent invité par la company
- `requested` - Agent a demandé à rejoindre le gig
- `enrolled` - Agent accepté et enrôlé
- `rejected` - Invitation ou demande rejetée
- `expired` - Invitation expirée
- `cancelled` - Relation annulée

---

## 🔄 Synchronisation Automatique

Lorsque vous effectuez une action (invite, accept, reject, request), le système met automatiquement à jour :

### Dans la collection `Agent` :
```json
{
  "_id": "agent123",
  "gigs": [
    {
      "gigId": "gig456",
      "status": "invited",
      "invitationDate": "2025-10-10T10:00:00.000Z",
      "updatedAt": "2025-10-10T10:00:00.000Z"
    }
  ]
}
```

### Dans la collection `Gig` :
```json
{
  "_id": "gig456",
  "agents": [
    {
      "agentId": "agent123",
      "status": "invited",
      "invitationDate": "2025-10-10T10:00:00.000Z",
      "updatedAt": "2025-10-10T10:00:00.000Z"
    }
  ]
}
```

---

## 📍 Endpoints Disponibles

### 1. **Créer une invitation (Company invite Agent)**

**Endpoint:** `POST /api/gig-agents`

**Body:**
```json
{
  "agentId": "68347eb86e2a220b4066a877",
  "gigId": "687d22e341c851ddf8e90462",
  "notes": "Perfect match for this position"
}
```

**Résultat:**
- Crée un GigAgent avec `enrollmentStatus: 'invited'`
- Ajoute dans `Agent.gigs` avec status `invited`
- Ajoute dans `Gig.agents` avec status `invited`
- Envoie un email à l'agent

---

### 2. **Agent accepte une invitation**

**Endpoint:** `POST /api/gig-agents/invitations/:id/accept`

**Params:**
- `:id` = ID du GigAgent (invitation)

**Body (optionnel):**
```json
{
  "notes": "Excited to join this gig!"
}
```

**Résultat:**
- Change `enrollmentStatus` à `'enrolled'`
- Met à jour `Agent.gigs` status à `enrolled`
- Met à jour `Gig.agents` status à `enrolled`
- Ajoute `enrollmentDate`

---

### 3. **Agent rejette une invitation**

**Endpoint:** `POST /api/gig-agents/invitations/:id/reject`

**Params:**
- `:id` = ID du GigAgent (invitation)

**Body (optionnel):**
```json
{
  "notes": "Not interested at this time"
}
```

**Résultat:**
- Change `enrollmentStatus` à `'rejected'`
- Met à jour `Agent.gigs` status à `rejected`
- Met à jour `Gig.agents` status à `rejected`

---

### 4. **Agent envoie une demande d'enrollment**

**Endpoint:** `POST /api/gig-agents/enrollment-request/:agentId/:gigId`

**Params:**
- `:agentId` = ID de l'agent
- `:gigId` = ID du gig

**Body (optionnel):**
```json
{
  "notes": "I would love to work on this gig"
}
```

**Résultat:**
- Crée un GigAgent avec `enrollmentStatus: 'requested'`
- Ajoute dans `Agent.gigs` avec status `requested`
- Ajoute dans `Gig.agents` avec status `requested`

---

### 5. **Company accepte une demande d'enrollment**

**Endpoint:** `POST /api/gig-agents/enrollment-requests/:id/accept`

**Params:**
- `:id` = ID du GigAgent (demande)

**Body (optionnel):**
```json
{
  "notes": "Welcome to the team!"
}
```

**Résultat:**
- Change `enrollmentStatus` à `'enrolled'`
- Met à jour `Agent.gigs` status à `enrolled`
- Met à jour `Gig.agents` status à `enrolled`
- Ajoute `enrollmentDate`

---

## 🔍 Récupération des Données avec Populate

### 6. **Récupérer tous les gigs d'un agent (avec populate)**

**Endpoint:** `GET /api/gig-agents/agent-gigs/:agentId`

**Params:**
- `:agentId` = ID de l'agent

**Query Parameters (optionnel):**
- `?status=invited` - Filtrer par statut spécifique
- `?status=enrolled` - Seulement les gigs enrolled
- `?status=requested` - Seulement les demandes

**Exemples:**

```bash
# Tous les gigs de l'agent
GET https://api-matching.harx.ai/api/gig-agents/agent-gigs/68347eb86e2a220b4066a877

# Seulement les invitations
GET https://api-matching.harx.ai/api/gig-agents/agent-gigs/68347eb86e2a220b4066a877?status=invited

# Seulement les gigs enrolled
GET https://api-matching.harx.ai/api/gig-agents/agent-gigs/68347eb86e2a220b4066a877?status=enrolled
```

**Réponse:**
```json
{
  "message": "Agent gigs retrieved successfully",
  "count": 2,
  "agentId": "68347eb86e2a220b4066a877",
  "filterStatus": "invited",
  "gigs": [
    {
      "gig": {
        "_id": "687d22e341c851ddf8e90462",
        "title": "Sales Representative",
        "description": "...",
        "commission": {
          "currency": {
            "_id": "currency123",
            "code": "USD",
            "symbol": "$"
          }
        },
        "destination_zone": {
          "_id": "country456",
          "name": "France"
        }
      },
      "status": "invited",
      "invitationDate": "2025-10-10T10:00:00.000Z",
      "updatedAt": "2025-10-10T10:00:00.000Z"
    }
  ]
}
```

---

### 7. **Récupérer tous les agents d'un gig (avec populate)**

**Endpoint:** `GET /api/gig-agents/gig-agents/:gigId`

**Params:**
- `:gigId` = ID du gig

**Query Parameters (optionnel):**
- `?status=invited` - Filtrer par statut spécifique
- `?status=enrolled` - Seulement les agents enrolled
- `?status=requested` - Seulement les demandes

**Exemples:**

```bash
# Tous les agents du gig
GET https://api-matching.harx.ai/api/gig-agents/gig-agents/687d22e341c851ddf8e90462

# Seulement les agents enrolled
GET https://api-matching.harx.ai/api/gig-agents/gig-agents/687d22e341c851ddf8e90462?status=enrolled

# Seulement les invitations en attente
GET https://api-matching.harx.ai/api/gig-agents/gig-agents/687d22e341c851ddf8e90462?status=invited
```

**Réponse:**
```json
{
  "message": "Gig agents retrieved successfully",
  "count": 3,
  "gigId": "687d22e341c851ddf8e90462",
  "filterStatus": "enrolled",
  "agents": [
    {
      "agent": {
        "_id": "68347eb86e2a220b4066a877",
        "personalInfo": {
          "name": "John Doe",
          "email": "john@example.com"
        },
        "professionalSummary": {
          "yearsOfExperience": 5
        }
      },
      "status": "enrolled",
      "enrollmentDate": "2025-10-10T11:00:00.000Z",
      "invitationDate": "2025-10-10T10:00:00.000Z",
      "updatedAt": "2025-10-10T11:00:00.000Z"
    }
  ]
}
```

---

## 📖 Exemples d'utilisation dans Postman

### Scénario 1 : Company invite un agent

1. **Créer l'invitation:**
   ```
   POST https://api-matching.harx.ai/api/gig-agents
   Body: { "agentId": "xxx", "gigId": "yyy" }
   ```

2. **Vérifier les gigs de l'agent:**
   ```
   GET https://api-matching.harx.ai/api/gig-agents/agent-gigs/xxx?status=invited
   ```

3. **Agent accepte:**
   ```
   POST https://api-matching.harx.ai/api/gig-agents/invitations/{gigAgentId}/accept
   ```

4. **Vérifier le statut mis à jour:**
   ```
   GET https://api-matching.harx.ai/api/gig-agents/agent-gigs/xxx?status=enrolled
   ```

---

### Scénario 2 : Agent demande à rejoindre un gig

1. **Agent envoie une demande:**
   ```
   POST https://api-matching.harx.ai/api/gig-agents/enrollment-request/agentId/gigId
   ```

2. **Vérifier les demandes pour le gig:**
   ```
   GET https://api-matching.harx.ai/api/gig-agents/gig-agents/gigId?status=requested
   ```

3. **Company accepte la demande:**
   ```
   POST https://api-matching.harx.ai/api/gig-agents/enrollment-requests/{gigAgentId}/accept
   ```

4. **Vérifier les agents enrolled:**
   ```
   GET https://api-matching.harx.ai/api/gig-agents/gig-agents/gigId?status=enrolled
   ```

---

## 🎯 Cas d'usage courants

### Pour récupérer les "enrolled" gigs d'un agent:
```
GET /api/gig-agents/agent-gigs/:agentId?status=enrolled
```

### Pour récupérer les "invited" gigs d'un agent:
```
GET /api/gig-agents/agent-gigs/:agentId?status=invited
```

### Pour récupérer tous les agents enrolled d'un gig:
```
GET /api/gig-agents/gig-agents/:gigId?status=enrolled
```

### Pour récupérer toutes les demandes en attente pour un gig:
```
GET /api/gig-agents/gig-agents/:gigId?status=requested
```

---

## ⚠️ Notes Importantes

1. **Synchronisation automatique** : Tous les changements de statut sont automatiquement synchronisés entre Agent.gigs et Gig.agents

2. **Populate automatique** : Les nouveaux endpoints incluent automatiquement les détails complets (currency, timezone, destination_zone, etc.)

3. **Backward compatible** : Les anciens endpoints continuent de fonctionner normalement

4. **Filtrage flexible** : Utilisez le paramètre `?status=` pour filtrer par statut spécifique

5. **Migration** : Les données existantes dans GigAgent seront progressivement synchronisées lors des prochaines opérations

---

## 🔧 Structure des Données

### Dans Agent Model:
```javascript
gigs: [{
  gigId: { type: ObjectId, ref: 'Gig' },
  status: { type: String, enum: ['invited', 'requested', 'enrolled', 'rejected', 'expired', 'cancelled'] },
  enrollmentDate: Date,
  invitationDate: Date,
  updatedAt: Date
}]
```

### Dans Gig Model:
```javascript
agents: [{
  agentId: { type: ObjectId, ref: 'Agent' },
  status: { type: String, enum: ['invited', 'requested', 'enrolled', 'rejected', 'expired', 'cancelled'] },
  enrollmentDate: Date,
  invitationDate: Date,
  updatedAt: Date
}]
```

