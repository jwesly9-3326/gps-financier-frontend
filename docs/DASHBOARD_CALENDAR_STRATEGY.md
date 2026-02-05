# 📅 STRATÉGIE AMÉLIORATION DASHBOARD - CALENDRIER D'ÉVÉNEMENTS

## 🎯 OBJECTIF

Transformer le dashboard de simple "vue d'ensemble" en **centre de planification proactive** qui aide l'utilisateur à anticiper ses dépenses futures.

---

## 📊 ÉTAT ACTUEL

**Événements actuellement affichés:**
- Événements saisonniers fixes (Noël, Vacances été, etc.)
- Calendrier événements prédéfinis

**Problème:** Trop générique. Pas assez personnalisé à L'utilisateur.

---

## 🚀 AMÉLIRATIONS PROPOSÉES

### **PHASE 1: Événements Personnalisés (Semaine 1-2)**

**Permettre à l'utilisateur d'ajouter SES propres événements:**

```javascript
Types d'événements personnalisés:

1. Récurrents annuels:
   - Anniversaires (enfants, conjoint, parents)
   - Fêtes religieuses personnelles
   - Vacances annuelles (dates précises)
   - Paiements annuels (assurances, abonnements)

2. One-time events:
   - Achats planifiés (auto, électro, etc.)
   - Projets maison (rénovations)
   - Événements familiaux (mariages, etc.)

3. Saisons personnalisées:
   - Rentrée scolaire (si enfants)
   - Taxes (date personnalisée)
   - Budget Noël (montant personnel)
```

**UI Proposée:**

```
Dashboard → Section "Prochains Événements"
├─ Bouton "+ Ajouter un événement"
├─ Modal création événement:
│   ├─ Nom événement
│   ├─ Date (ou récurrence)
│   ├─ Montant estimé
│   ├─ Catégorie (dépense/revenu/neutre)
│   ├─ Icône (picker emoji)
│   └─ Couleur (picker couleur)
└─ Affichage: Cards événements triés par date

Interaction:
- Click événement → Navigate to GPS à cette date
- Badge alerte si budget insuffisant pour événement
- Notification X jours avant (configurable)
```

---

### **PHASE 2: Événements Intelligents (Semaine 3-4)**

**Détection automatique d'événements basée sur historique budget:**

```javascript
Logique de détection:

1. Analyser budgetPlanning de l'utilisateur
2. Identifier patterns:
   - Dépenses récurrentes annuelles
   - Dépenses saisonnières (ex: chauffage hiver)
   - Dépenses irrégulières mais prévisibles

3. Suggérer événements automatiques:
   "On a remarqué que tu dépenses ~800$ en décembre.
    Veux-tu créer un événement 'Budget Noël'?"

4. Créer événements auto si user accepte
```

**Types d'événements auto-détectés:**
- Paiements taxes (avril)
- Assurances annuelles
- Renouvellements abonnements
- Pics saisonniers dépenses

---

### **PHASE 3: Intégration GPS (Semaine 5-6)**

**Lier événements au GPS pour visualisation complète:**

```javascript
Fonctionnalités:

1. Markers événements sur timeline GPS:
   - Icône événement affiché sur date exacte
   - Couleur selon impact (vert=revenu, rouge=dépense)
   - Hover → Détails événement

2. Impact budget visible:
   - Projection solde ajustée avec événement
   - Alerte si solde négatif à date événement
   - Suggestion ajustement budget si nécessaire

3. Mode "Planification événement":
   - Click événement dashboard → GPS jump à cette date
   - Affiche contexte: solde prévu, buffer disponible
   - Option "Préparer cet événement" → Crée modifications budget
```

---

### **PHASE 4: Alertes Proactives (Semaine 7-8)**

**Système de notifications intelligentes:**

```javascript
Types d'alertes:

1. Pré-événement (X jours avant):
   "🎄 Noël dans 30 jours - Budget prévu: 800$
    Ton solde prévu: 1,250$ ✅"

2. Budget insuffisant:
   "⚠️ Vacances dans 45 jours - Budget: 2,000$
    Ton solde prévu: 1,400$ ❌
    → Ajuster budget ou reporter?"

3. Opportunité d'épargne:
   "💡 Événement annulé? Redirige les 500$ vers
    ton objectif 'Fonds urgence'?"

4. Rappel contribution:
   "🎯 Pour atteindre ton objectif 'Voyage'
    en juin, ajoute 75$/mois maintenant"
```

---

## 📅 TIMELINE IMPLÉMENTATION

```
SEMAINE 1-2: Événements personnalisés
├─ Modal création/édition
├─ Stockage dans UserData
├─ Affichage dashboard
└─ Link vers GPS

SEMAINE 3-4: Détection automatique
├─ Analyse patterns budget
├─ Suggestions événements
├─ Acceptation/Refus user
└─ Création auto

SEMAINE 5-6: Intégration GPS
├─ Markers timeline
├─ Impact projection
├─ Mode planification
└─ Suggestions ajustements

SEMAINE 7-8: Alertes proactives
├─ Système notifications
├─ Configuration préférences
├─ Email reminders (optionnel)
└─ Push notifications PWA

TOTAL: 8 SEMAINES = 2 MOIS
```

---

## 🎨 MOCKUP UI ÉVÉNEMENTS

```
┌─────────────────────────────────────┐
│  📅 Prochains Événements            │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🎄 Noël                      │   │
│  │ 25 déc 2026 · 800$          │   │
│  │ Solde prévu: 1,250$ ✅      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🏖️ Vacances été             │   │
│  │ 15 juil 2026 · 2,000$       │   │
│  │ Solde prévu: 1,850$ ⚠️      │   │
│  │ → Ajuster budget             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ + Ajouter un événement      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 💾 STRUCTURE DONNÉES

```javascript
// Dans UserData.events (nouveau champ)
{
  "events": [
    {
      "id": "evt_001",
      "name": "Noël",
      "date": "2026-12-25",
      "amount": 800,
      "type": "expense",
      "category": "seasonal",
      "icon": "🎄",
      "color": "#16a34a",
      "recurring": "yearly",
      "autoDetected": false,
      "notifyDaysBefore": 30,
      "createdAt": "2026-01-16T...",
      "updatedAt": "2026-01-16T..."
    },
    {
      "id": "evt_002",
      "name": "Anniversaire Sophie",
      "date": "2026-03-15",
      "amount": 150,
      "type": "expense",
      "category": "personal",
      "icon": "🎂",
      "color": "#ec4899",
      "recurring": "yearly",
      "autoDetected": false,
      "notifyDaysBefore": 14
    }
  ]
}
```

---

## 🔧 BACKEND CHANGES REQUIS

```javascript
// Nouvelles routes API

POST   /api/events              // Créer événement
GET    /api/events              // Liste événements user
GET    /api/events/:id          // Détails événement
PATCH  /api/events/:id          // Modifier événement
DELETE /api/events/:id          // Supprimer événement

GET    /api/events/suggestions  // Événements auto-détectés
POST   /api/events/accept-suggestion  // Accepter suggestion
```

---

## 📊 METRICS À TRACKER

```
Adoption:
- % users qui créent ≥1 événement
- Nombre moyen événements par user
- % users qui acceptent suggestions auto

Engagement:
- Clicks événements (vers GPS)
- Actions prises suite alertes
- Taux ouverture notifications

Value:
- Événements évitant découverts
- $ économisés via anticipation
- Satisfaction feature (sondage)
```

---

## 🎯 SUCCESS CRITERIA

```
OBJECTIF 1 MOIS:
├─ 60% users créent ≥1 événement
├─ 40% users utilisent suggestions auto
└─ 80% users trouvent feature utile

OBJECTIF 3 MOIS:
├─ 80% users ont 3+ événements
├─ 50% clicks événements → GPS
├─ 30% améliorent budget suite alertes
└─ Feature #1 most used (après GPS)
```

---

**RÉSUMÉ:** Cette feature transforme PL4TO de "outil qui montre le futur" à "outil qui PRÉPARE activement le futur". C'est aligné avec votre vision de donner à l'utilisateur SON outil pour SON parcours.
