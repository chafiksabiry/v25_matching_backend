# 🔄 Mise à jour : Système de Synchronisation des Relations Agent-Gig

## 📅 Date : 10 Octobre 2025

## 🎯 Objectif

Implémenter un système qui synchronise automatiquement les relations entre les agents et les gigs dans les deux collections (Agent et Gig) avec leurs statuts respectifs.

---

## 📝 Changements Effectués

### 1. **Modèles de Données Mis à Jour**

#### `models/Agent.js`
Ajout du champ `gigs` pour tracker les gigs avec leur statut :

```javascript
gigs: [{
  gigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    required: true
  },
  status: {
    type: String,
    enum: ['invited', 'requested', 'enrolled', 'rejected', 'expired', 'cancelled'],
    required: true
  },
  enrollmentDate: Date,
  invitationDate: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  }
}]
```

#### `models/Gig.js`
Ajout du champ `agents` pour tracker les agents avec leur statut :

```javascript
agents: [{
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  status: {
    type: String,
    enum: ['invited', 'requested', 'enrolled', 'rejected', 'expired', 'cancelled'],
    required: true
  },
  enrollmentDate: Date,
  invitationDate: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  }
}]
```

---

### 2. **Nouveaux Utilitaires**

#### `utils/relationshipSync.js`
Création d'un fichier avec les fonctions suivantes :

- **`syncAgentGigRelationship(agentId, gigId, status, options)`**
  - Synchronise la relation dans Agent.gigs ET Gig.agents
  - Crée la relation si elle n'existe pas
  - Met à jour le statut si elle existe déjà

- **`removeAgentGigRelationship(agentId, gigId)`**
  - Supprime la relation des deux côtés

- **`getAgentGigsWithDetails(agentId, statusFilter)`**
  - Récupère tous les gigs d'un agent avec populate
  - Filtre optionnel par statut

- **`getGigAgentsWithDetails(gigId, statusFilter)`**
  - Récupère tous les agents d'un gig avec populate
  - Filtre optionnel par statut

---

### 3. **Controllers Mis à Jour**

#### `controllers/gigAgentController.js`

**Imports ajoutés :**
```javascript
import { 
  syncAgentGigRelationship, 
  getAgentGigsWithDetails, 
  getGigAgentsWithDetails 
} from '../utils/relationshipSync.js';
```

**Fonctions modifiées avec synchronisation :**

1. **`createGigAgent`** (Invitation)
   - Synchronise avec status `'invited'`
   - Ajoute `invitationDate`

2. **`agentAcceptInvitation`**
   - Synchronise avec status `'enrolled'`
   - Ajoute `enrollmentDate`

3. **`acceptEnrollmentRequest`**
   - Synchronise avec status `'enrolled'`
   - Ajoute `enrollmentDate`

4. **`agentRejectInvitation`**
   - Synchronise avec status `'rejected'`

5. **`sendEnrollmentRequest`**
   - Synchronise avec status `'requested'`
   - Ajoute `invitationDate`

**Nouveaux endpoints créés :**

6. **`getAgentGigsWithStatus`**
   - GET `/api/gig-agents/agent-gigs/:agentId`
   - Query param : `?status=invited`
   - Retourne tous les gigs d'un agent avec populate complet

7. **`getGigAgentsWithStatus`**
   - GET `/api/gig-agents/gig-agents/:gigId`
   - Query param : `?status=enrolled`
   - Retourne tous les agents d'un gig avec populate complet

---

### 4. **Routes Mises à Jour**

#### `routes/gigAgentRoutes.js`

**Nouvelles routes ajoutées :**

```javascript
// GET /api/gig-agents/agent-gigs/:agentId?status=invited
router.get('/agent-gigs/:agentId', getAgentGigsWithStatus);

// GET /api/gig-agents/gig-agents/:gigId?status=enrolled
router.get('/gig-agents/:gigId', getGigAgentsWithStatus);
```

---

## 🚀 Fonctionnalités Principales

### ✅ Synchronisation Automatique
- Chaque action (invite, accept, reject, request) met automatiquement à jour :
  - `Agent.gigs[]` avec le gigId et le statut
  - `Gig.agents[]` avec l'agentId et le statut

### ✅ Populate Automatique
- Les nouveaux endpoints incluent automatiquement :
  - Currency details
  - Timezone details
  - Destination zone
  - Toutes les relations nécessaires

### ✅ Filtrage Flexible
- Filtrage par statut via query parameters
- Récupération de tous les statuts si pas de filtre

### ✅ Rétrocompatibilité
- Les anciens endpoints continuent de fonctionner
- Pas de breaking changes

---

## 📊 Flux de Données

### Exemple : Company invite un Agent

1. **POST** `/api/gig-agents`
   ```json
   { "agentId": "xxx", "gigId": "yyy" }
   ```

2. **Résultat automatique:**
   - Création du GigAgent
   - Ajout dans `Agent.gigs` :
     ```json
     { "gigId": "yyy", "status": "invited", "invitationDate": "..." }
     ```
   - Ajout dans `Gig.agents` :
     ```json
     { "agentId": "xxx", "status": "invited", "invitationDate": "..." }
     ```

3. **Vérification:**
   ```
   GET /api/gig-agents/agent-gigs/xxx?status=invited
   ```

---

## 🔍 Cas d'Usage

### Récupérer les gigs "invited" d'un agent
```bash
GET /api/gig-agents/agent-gigs/{agentId}?status=invited
```

### Récupérer les gigs "enrolled" d'un agent
```bash
GET /api/gig-agents/agent-gigs/{agentId}?status=enrolled
```

### Récupérer tous les agents "enrolled" d'un gig
```bash
GET /api/gig-agents/gig-agents/{gigId}?status=enrolled
```

### Récupérer toutes les demandes "requested" pour un gig
```bash
GET /api/gig-agents/gig-agents/{gigId}?status=requested
```

---

## 📋 Statuts Disponibles

| Statut | Description |
|--------|-------------|
| `invited` | Agent invité par la company |
| `requested` | Agent a demandé à rejoindre le gig |
| `enrolled` | Agent accepté et enrôlé |
| `rejected` | Invitation ou demande rejetée |
| `expired` | Invitation expirée |
| `cancelled` | Relation annulée |

---

## 🧪 Tests avec Postman

### Scénario Complet : Invitation → Acceptation

1. **Créer une invitation**
   ```
   POST /api/gig-agents
   Body: { "agentId": "68347eb86e2a220b4066a877", "gigId": "687d22e341c851ddf8e90462" }
   ```

2. **Vérifier les invitations de l'agent**
   ```
   GET /api/gig-agents/agent-gigs/68347eb86e2a220b4066a877?status=invited
   ```
   ✅ Devrait retourner le gig avec status "invited"

3. **Agent accepte l'invitation**
   ```
   POST /api/gig-agents/invitations/{gigAgentId}/accept
   ```

4. **Vérifier les gigs enrolled de l'agent**
   ```
   GET /api/gig-agents/agent-gigs/68347eb86e2a220b4066a877?status=enrolled
   ```
   ✅ Devrait retourner le gig avec status "enrolled"

5. **Vérifier du côté du gig**
   ```
   GET /api/gig-agents/gig-agents/687d22e341c851ddf8e90462?status=enrolled
   ```
   ✅ Devrait retourner l'agent avec status "enrolled"

---

## ⚙️ Configuration Requise

### Aucune migration nécessaire
- Les champs `gigs` et `agents` seront automatiquement créés lors de la première opération
- Les données existantes dans GigAgent continuent de fonctionner normalement
- La synchronisation se fait progressivement avec chaque nouvelle opération

### Pas de breaking changes
- Tous les anciens endpoints fonctionnent toujours
- Les nouveaux endpoints sont additionnels
- La synchronisation est optionnelle (gérée automatiquement mais en try/catch)

---

## 📚 Documentation

Consultez `AGENT_GIG_RELATIONSHIP_API.md` pour :
- Documentation complète des endpoints
- Exemples d'utilisation avec Postman
- Structures de données détaillées
- Scénarios d'usage courants

---

## ✨ Avantages

1. **Performance** : Pas besoin de faire des joins complexes, les IDs sont directement accessibles
2. **Facilité** : Un seul appel API pour récupérer tous les gigs/agents avec leur statut
3. **Consistance** : Les données sont toujours synchronisées des deux côtés
4. **Flexibilité** : Filtrage facile par statut
5. **Évolutivité** : Facile d'ajouter de nouveaux statuts si nécessaire

---

## 🔮 Prochaines Étapes Possibles

1. Ajouter un endpoint pour mettre à jour manuellement les statuts
2. Créer des webhooks pour notifier les changements de statut
3. Ajouter des logs d'historique pour suivre l'évolution des statuts
4. Implémenter une fonction de migration pour synchroniser les données existantes
5. Ajouter des statistiques par statut (nombre d'invited, enrolled, etc.)

---

## 📞 Support

Pour toute question ou problème, référez-vous à :
- `AGENT_GIG_RELATIONSHIP_API.md` pour la documentation API
- Les logs de console pour le debugging
- Les messages d'erreur qui incluent des détails sur les échecs de synchronisation

