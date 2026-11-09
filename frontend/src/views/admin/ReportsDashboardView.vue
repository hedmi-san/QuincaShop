<template>
  <div class="reports-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Analyses Financières & Pilotage Exécutif</h1>
        <p class="page-subtitle">Compte de résultat (P&L), valorisation des actifs et balance âgée des créances.</p>
      </div>

      <!-- Tab Buttons -->
      <div class="tab-buttons">
        <button
          class="tab-btn"
          :class="{ active: currentTab === 'kpis' }"
          @click="currentTab = 'kpis'"
        >
          📊 Vue d'Ensemble
        </button>
        <button
          class="tab-btn"
          :class="{ active: currentTab === 'pnl' }"
          @click="switchTab('pnl')"
        >
          📉 Compte de Résultat (P&L)
        </button>
        <button
          class="tab-btn"
          :class="{ active: currentTab === 'stock' }"
          @click="switchTab('stock')"
        >
          📦 Valorisation des Stocks
        </button>
        <button
          class="tab-btn"
          :class="{ active: currentTab === 'receivables' }"
          @click="switchTab('receivables')"
        >
          💳 Balance Âgée
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="reportStore.loading && !reportStore.downloading" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement des analyses en cours...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="reportStore.error" class="alert alert-danger">
      {{ reportStore.error }}
    </div>

    <!-- ============================================================== -->
    <!-- TAB 1: EXECUTIVE DASHBOARD & KPIS                              -->
    <!-- ============================================================== -->
    <div v-else-if="currentTab === 'kpis' && reportStore.dashboardKpis" class="tab-content">
      <!-- Top Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card highlight-card">
          <span class="metric-lbl">Chiffre d'Affaires du Jour</span>
          <span class="metric-val text-primary">
            {{ formatCurrency(reportStore.dashboardKpis.today.revenueTtc) }}
          </span>
          <div class="metric-sub">
            HT : {{ formatCurrency(reportStore.dashboardKpis.today.revenueHt) }} • {{ reportStore.dashboardKpis.today.ordersCount }} commande(s)
          </div>
        </div>

        <div class="metric-card">
          <span class="metric-lbl">Ventes Mensuelles (MTD)</span>
          <span class="metric-val text-success">
            {{ formatCurrency(reportStore.dashboardKpis.monthToDate.revenueTtc) }}
          </span>
          <div class="metric-sub">
            HT : {{ formatCurrency(reportStore.dashboardKpis.monthToDate.revenueHt) }} • {{ reportStore.dashboardKpis.monthToDate.ordersCount }} commande(s)
          </div>
        </div>

        <div class="metric-card">
          <span class="metric-lbl">Encaissements du Mois (Versements)</span>
          <span class="metric-val text-dark">
            {{ formatCurrency(reportStore.dashboardKpis.monthToDate.paymentsReceived) }}
          </span>
          <div class="metric-sub">Règlements clients encaissés</div>
        </div>

        <div class="metric-card">
          <span class="metric-lbl">Total Créances Clients en Cours</span>
          <span class="metric-val text-danger">
            {{ formatCurrency(reportStore.dashboardKpis.balances.totalReceivables) }}
          </span>
          <div class="metric-sub">{{ reportStore.dashboardKpis.alerts.debtorClientsCount }} client(s) débiteur(s)</div>
        </div>

        <div class="metric-card">
          <span class="metric-lbl">Valeur du Stock au Coût d'Achat</span>
          <span class="metric-val text-info">
            {{ formatCurrency(reportStore.dashboardKpis.balances.totalInventoryCost) }}
          </span>
          <div class="metric-sub">Actif immobilisé en marchandise</div>
        </div>
      </div>

      <!-- Operational Alerts Bar -->
      <div class="alerts-banner">
        <div class="alert-item" :class="{ 'has-alert': reportStore.dashboardKpis.alerts.pendingClientsCount > 0 }">
          <span class="alert-icon">👥</span>
          <div>
            <strong>{{ reportStore.dashboardKpis.alerts.pendingClientsCount }} Demande(s) d'Agrément en Attente</strong>
            <p>Comptes B2B en attente de vérification du Registre de Commerce.</p>
          </div>
          <router-link to="/admin/clients/pending" class="btn btn-outline btn-sm">
            Examiner
          </router-link>
        </div>

        <div class="alert-item" :class="{ 'has-alert': reportStore.dashboardKpis.alerts.lowStockCount > 0 }">
          <span class="alert-icon">⚠️</span>
          <div>
            <strong>{{ reportStore.dashboardKpis.alerts.lowStockCount }} Article(s) en Rupture ou Alerte</strong>
            <p>Quantité disponible inférieure ou égale au seuil de sécurité.</p>
          </div>
          <button class="btn btn-outline btn-sm" @click="currentTab = 'stock'; filterLowStockOnly = true">
            Voir Stock
          </button>
        </div>
      </div>

      <!-- Recent Orders Section -->
      <div class="section-card">
        <div class="card-header">
          <h3>Dernières Commandes Enregistrées</h3>
          <router-link to="/admin/orders" class="btn-link">Toutes les commandes →</router-link>
        </div>

        <div class="table-responsive">
          <table class="report-table">
            <thead>
              <tr>
                <th>N° Commande</th>
                <th>Client</th>
                <th>Date / Heure</th>
                <th class="text-right">Montant TTC</th>
                <th style="width: 130px; text-align: center;">Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ord in reportStore.dashboardKpis.recentOrders" :key="ord.id">
                <td class="font-mono font-bold">{{ ord.order_number }}</td>
                <td>
                  <strong>{{ ord.client_name }}</strong>
                  <span class="client-code font-mono">{{ ord.client_code }}</span>
                </td>
                <td>{{ formatDateTime(ord.created_at) }}</td>
                <td class="text-right font-mono font-bold">{{ formatCurrency(ord.total_ttc) }}</td>
                <td class="text-center">
                  <span class="status-badge" :class="'status-' + ord.status.toLowerCase()">
                    {{ getStatusLabel(ord.status) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- TAB 2: INCOME STATEMENT (COMPTE DE RÉSULTAT P&L)               -->
    <!-- ============================================================== -->
    <div v-else-if="currentTab === 'pnl' && reportStore.incomeStatement" class="tab-content">
      <!-- Period Selector & Action Bar -->
      <div class="filters-card">
        <div class="date-filters">
          <div class="form-group">
            <label>Du :</label>
            <input type="date" v-model="pnlFromDate" class="form-control" />
          </div>
          <div class="form-group">
            <label>Au :</label>
            <input type="date" v-model="pnlToDate" class="form-control" />
          </div>
          <button class="btn btn-primary" @click="applyPnlFilter">
            Actualiser
          </button>
          <div class="preset-links">
            <button class="btn-link-xs" @click="setPresetPeriod('this-year')">Année en cours</button>
            <span>•</span>
            <button class="btn-link-xs" @click="setPresetPeriod('this-month')">Ce mois</button>
            <span>•</span>
            <button class="btn-link-xs" @click="setPresetPeriod('last-month')">Mois dernier</button>
          </div>
        </div>

        <button
          class="btn btn-export"
          :disabled="reportStore.downloading"
          @click="reportStore.downloadExcelReport('income-statement', { from: pnlFromDate, to: pnlToDate })"
        >
          📥 {{ reportStore.downloading ? 'Téléchargement...' : 'Exporter Excel (.xlsx)' }}
        </button>
      </div>

      <!-- P&L Financial Cards Summary -->
      <div class="pnl-waterfall-grid">
        <div class="waterfall-card">
          <span class="w-lbl">Chiffre d'Affaires Net (HT)</span>
          <span class="w-val text-primary">{{ formatCurrency(reportStore.incomeStatement.revenue.netRevenueHT) }}</span>
          <span class="w-sub">Brut: {{ formatCurrency(reportStore.incomeStatement.revenue.grossRevenueHT) }}</span>
        </div>

        <div class="waterfall-card">
          <span class="w-lbl">Coût d'Achat Marchandises (COGS)</span>
          <span class="w-val text-muted">- {{ formatCurrency(reportStore.incomeStatement.cogs.total) }}</span>
          <span class="w-sub">Prix d'achat des articles vendus</span>
        </div>

        <div class="waterfall-card">
          <span class="w-lbl">Marge Brute Commerciale</span>
          <span class="w-val text-success">{{ formatCurrency(reportStore.incomeStatement.grossMargin.amount) }}</span>
          <span class="w-sub">Taux de marge : {{ reportStore.incomeStatement.grossMargin.percentage }} %</span>
        </div>

        <div class="waterfall-card">
          <span class="w-lbl">Frais Généraux d'Exploitation</span>
          <span class="w-val text-danger">- {{ formatCurrency(reportStore.incomeStatement.overheadExpenses.total) }}</span>
          <span class="w-sub">{{ reportStore.incomeStatement.overheadExpenses.categories.length }} postes de charges</span>
        </div>

        <div class="waterfall-card">
          <span class="w-lbl">Masse Salariale & Primes</span>
          <span class="w-val text-danger">- {{ formatCurrency(reportStore.incomeStatement.payroll.total) }}</span>
          <span class="w-sub">{{ reportStore.incomeStatement.payroll.payslipsCount }} bulletin(s) de paie</span>
        </div>

        <div
          class="waterfall-card result-card"
          :class="reportStore.incomeStatement.netProfit.status === 'PROFIT' ? 'card-profit' : 'card-loss'"
        >
          <span class="w-lbl">RÉSULTAT NET D'EXPLOITATION</span>
          <span class="w-val">
            {{ formatCurrency(reportStore.incomeStatement.netProfit.amount) }}
          </span>
          <span class="w-sub">
            {{ reportStore.incomeStatement.netProfit.status === 'PROFIT' ? 'BÉNÉFICE NET' : 'DÉFICIT' }} • Taux net : {{ reportStore.incomeStatement.netProfit.percentage }} %
          </span>
        </div>
      </div>

      <!-- Detailed P&L Financial Statement Table -->
      <div class="section-card">
        <div class="card-header">
          <h3>Compte de Résultat Consolidé (P&L)</h3>
          <span class="badge-period">
            Période : {{ reportStore.incomeStatement.period.from }} au {{ reportStore.incomeStatement.period.to }}
          </span>
        </div>

        <div class="table-responsive">
          <table class="statement-table">
            <thead>
              <tr>
                <th>Poste Comptable</th>
                <th class="text-right" style="width: 200px;">Montant (DZD)</th>
                <th class="text-right" style="width: 140px;">% Chiffre d'Affaires</th>
                <th>Détails & Justifications</th>
              </tr>
            </thead>
            <tbody>
              <!-- Revenue Section -->
              <tr class="row-header">
                <td colspan="4"><strong>1. CHIFFRE D'AFFAIRES & PRODUITS D'EXPLOITATION</strong></td>
              </tr>
              <tr>
                <td class="pl-indent">Ventes brutes de marchandises (HT)</td>
                <td class="text-right font-mono font-bold">{{ formatCurrency(reportStore.incomeStatement.revenue.grossRevenueHT) }}</td>
                <td class="text-right font-mono">100.00 %</td>
                <td>{{ reportStore.incomeStatement.revenue.ordersCount }} commandes livrées</td>
              </tr>
              <tr v-if="reportStore.incomeStatement.revenue.creditNotes > 0">
                <td class="pl-indent text-muted">Moins : Avoirs & Annulations de Factures</td>
                <td class="text-right font-mono text-danger">- {{ formatCurrency(reportStore.incomeStatement.revenue.creditNotes) }}</td>
                <td class="text-right font-mono text-muted">-</td>
                <td>Notes de crédit accordées aux clients</td>
              </tr>
              <tr class="row-subtotal">
                <td><strong>CHIFFRE D'AFFAIRES NET (HT)</strong></td>
                <td class="text-right font-mono font-bold text-primary">{{ formatCurrency(reportStore.incomeStatement.revenue.netRevenueHT) }}</td>
                <td class="text-right font-mono font-bold">100.00 %</td>
                <td>Base de calcul de la rentabilité commerciale</td>
              </tr>

              <!-- COGS Section -->
              <tr class="row-header">
                <td colspan="4"><strong>2. COÛT D'ACHAT DES MARCHANDISES VENDUES (COGS)</strong></td>
              </tr>
              <tr>
                <td class="pl-indent">Achats consommés & sorties de stock</td>
                <td class="text-right font-mono text-danger">- {{ formatCurrency(reportStore.incomeStatement.cogs.total) }}</td>
                <td class="text-right font-mono">
                  {{ reportStore.incomeStatement.revenue.netRevenueHT > 0 ? ((reportStore.incomeStatement.cogs.total / reportStore.incomeStatement.revenue.netRevenueHT) * 100).toFixed(1) : '0.0' }} %
                </td>
                <td>Coût d'achat unitaire fournisseur des articles vendus</td>
              </tr>
              <tr class="row-subtotal highlight-row">
                <td><strong>MARGE BRUTE COMMERCIALE</strong></td>
                <td class="text-right font-mono font-bold text-success">{{ formatCurrency(reportStore.incomeStatement.grossMargin.amount) }}</td>
                <td class="text-right font-mono font-bold text-success">{{ reportStore.incomeStatement.grossMargin.percentage }} %</td>
                <td>Marge dégagée sur la revente du matériel</td>
              </tr>

              <!-- Operating Expenses Section -->
              <tr class="row-header">
                <td colspan="4"><strong>3. FRAIS GÉNÉRAUX D'EXPLOITATION</strong></td>
              </tr>
              <tr v-for="cat in reportStore.incomeStatement.overheadExpenses.categories" :key="cat.category">
                <td class="pl-indent">Charges : {{ getCategoryLabel(cat.category) }}</td>
                <td class="text-right font-mono text-danger">- {{ formatCurrency(cat.amount) }}</td>
                <td class="text-right font-mono">
                  {{ reportStore.incomeStatement.revenue.netRevenueHT > 0 ? ((cat.amount / reportStore.incomeStatement.revenue.netRevenueHT) * 100).toFixed(1) : '0.0' }} %
                </td>
                <td>{{ cat.count }} opération(s) enregistrée(s)</td>
              </tr>
              <tr class="row-subtotal">
                <td><strong>TOTAL FRAIS GÉNÉRAUX</strong></td>
                <td class="text-right font-mono font-bold text-danger">- {{ formatCurrency(reportStore.incomeStatement.overheadExpenses.total) }}</td>
                <td class="text-right font-mono font-bold">
                  {{ reportStore.incomeStatement.revenue.netRevenueHT > 0 ? ((reportStore.incomeStatement.overheadExpenses.total / reportStore.incomeStatement.revenue.netRevenueHT) * 100).toFixed(1) : '0.0' }} %
                </td>
                <td>Ensemble des dépenses de fonctionnement magasin</td>
              </tr>

              <!-- Personnel & Payroll Section -->
              <tr class="row-header">
                <td colspan="4"><strong>4. CHARGES DE PERSONNEL & SALAIRES</strong></td>
              </tr>
              <tr>
                <td class="pl-indent">Salaires contractuels de base</td>
                <td class="text-right font-mono text-danger">- {{ formatCurrency(reportStore.incomeStatement.payroll.baseSalaries) }}</td>
                <td class="text-right font-mono">
                  {{ reportStore.incomeStatement.revenue.netRevenueHT > 0 ? ((reportStore.incomeStatement.payroll.baseSalaries / reportStore.incomeStatement.revenue.netRevenueHT) * 100).toFixed(1) : '0.0' }} %
                </td>
                <td>Rémunération de base des collaborateurs</td>
              </tr>
              <tr v-if="reportStore.incomeStatement.payroll.bonus1Eid > 0">
                <td class="pl-indent">Primes de fête / Aïd</td>
                <td class="text-right font-mono text-danger">- {{ formatCurrency(reportStore.incomeStatement.payroll.bonus1Eid) }}</td>
                <td class="text-right font-mono">-</td>
                <td>Gratifications de l'Aïd</td>
              </tr>
              <tr v-if="reportStore.incomeStatement.payroll.bonus2Performance > 0">
                <td class="pl-indent">Primes de rendement & assiduité</td>
                <td class="text-right font-mono text-danger">- {{ formatCurrency(reportStore.incomeStatement.payroll.bonus2Performance) }}</td>
                <td class="text-right font-mono">-</td>
                <td>Incitations commerciales & logistiques</td>
              </tr>
              <tr v-if="reportStore.incomeStatement.payroll.deductions > 0">
                <td class="pl-indent text-muted">Retenues & avances sur salaires</td>
                <td class="text-right font-mono text-success">+ {{ formatCurrency(reportStore.incomeStatement.payroll.deductions) }}</td>
                <td class="text-right font-mono text-muted">-</td>
                <td>Remboursement d'avances perçues</td>
              </tr>
              <tr class="row-subtotal">
                <td><strong>MASSE SALARIALE NETTE TOTALE</strong></td>
                <td class="text-right font-mono font-bold text-danger">- {{ formatCurrency(reportStore.incomeStatement.payroll.total) }}</td>
                <td class="text-right font-mono font-bold">
                  {{ reportStore.incomeStatement.revenue.netRevenueHT > 0 ? ((reportStore.incomeStatement.payroll.total / reportStore.incomeStatement.revenue.netRevenueHT) * 100).toFixed(1) : '0.0' }} %
                </td>
                <td>{{ reportStore.incomeStatement.payroll.payslipsCount }} bulletins émis</td>
              </tr>

              <!-- Net Result Row -->
              <tr class="row-grand-total" :class="reportStore.incomeStatement.netProfit.status === 'PROFIT' ? 'profit-bg' : 'loss-bg'">
                <td><strong>RÉSULTAT NET D'EXPLOITATION</strong></td>
                <td class="text-right font-mono font-bold result-cell">{{ formatCurrency(reportStore.incomeStatement.netProfit.amount) }}</td>
                <td class="text-right font-mono font-bold result-cell">{{ reportStore.incomeStatement.netProfit.percentage }} %</td>
                <td>
                  <strong>{{ reportStore.incomeStatement.netProfit.status === 'PROFIT' ? 'BÉNÉFICE D\'EXPLOITATION RÉALISÉ' : 'DÉFICIT COMPTABLE' }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- TAB 3: STOCK ASSET VALUATION (VALORISATION DES STOCKS)         -->
    <!-- ============================================================== -->
    <div v-else-if="currentTab === 'stock' && reportStore.stockValuation" class="tab-content">
      <!-- Summary Cards -->
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-lbl">Valeur Stock (Coût d'Achat)</span>
          <span class="metric-val text-primary">{{ formatCurrency(reportStore.stockValuation.summary.totalCostValue) }}</span>
          <div class="metric-sub">Actif net immobilisé en entrepôt</div>
        </div>

        <div class="metric-card">
          <span class="metric-lbl">Valeur Potentielle de Vente</span>
          <span class="metric-val text-dark">{{ formatCurrency(reportStore.stockValuation.summary.totalRetailValue) }}</span>
          <div class="metric-sub">Au prix de vente B2B actuel</div>
        </div>

        <div class="metric-card">
          <span class="metric-lbl">Marge Potentielle Globale</span>
          <span class="metric-val text-success">{{ formatCurrency(reportStore.stockValuation.summary.totalPotentialMargin) }}</span>
          <div class="metric-sub">Taux : {{ reportStore.stockValuation.summary.potentialMarginRate }} %</div>
        </div>

        <div class="metric-card">
          <span class="metric-lbl">Unités Physiques en Rayon</span>
          <span class="metric-val text-info">{{ reportStore.stockValuation.summary.totalPhysicalUnits.toLocaleString('fr-DZ') }}</span>
          <div class="metric-sub">{{ reportStore.stockValuation.summary.totalSkus }} références catalogue</div>
        </div>
      </div>

      <!-- Filters & Export -->
      <div class="filters-card">
        <div class="filter-inputs">
          <div class="form-group">
            <label>Rayon / Catégorie :</label>
            <select v-model="stockSelectedCategory" class="form-control">
              <option value="ALL">Toutes les catégories</option>
              <option v-for="cat in reportStore.stockValuation.categories" :key="cat.name" :value="cat.name">
                {{ cat.name }} ({{ cat.skus }} réf.)
              </option>
            </select>
          </div>

          <div class="form-group search-group">
            <label>Recherche article :</label>
            <input
              type="text"
              v-model="stockSearchQuery"
              placeholder="Réf, désignation..."
              class="form-control"
            />
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="filterLowStockOnly" />
              <span>Articles en rupture / alerte uniquement ({{ reportStore.stockValuation.summary.lowStockCount }})</span>
            </label>
          </div>
        </div>

        <button
          class="btn btn-export"
          :disabled="reportStore.downloading"
          @click="reportStore.downloadExcelReport('stock-valuation')"
        >
          📥 {{ reportStore.downloading ? 'Téléchargement...' : 'Exporter Inventaire (.xlsx)' }}
        </button>
      </div>

      <!-- Stock Table Card -->
      <div class="section-card">
        <div class="table-responsive">
          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 140px;">Référence</th>
                <th>Désignation Article</th>
                <th style="width: 140px;">Catégorie</th>
                <th class="text-right" style="width: 110px;">Stock Physique</th>
                <th class="text-right" style="width: 110px;">Disponible</th>
                <th class="text-right" style="width: 130px;">Prix Achat (HT)</th>
                <th class="text-right" style="width: 130px;">Prix Vente (HT)</th>
                <th class="text-right" style="width: 160px;">Valorisation Coût</th>
                <th style="width: 100px; text-align: center;">Alerte</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in filteredStockItems" :key="it.id">
                <td class="font-mono font-bold">{{ it.reference }}</td>
                <td>{{ it.name }}</td>
                <td><span class="category-pill">{{ it.category }}</span></td>
                <td class="text-right font-mono">{{ it.physicalQuantity }} {{ it.unit }}</td>
                <td class="text-right font-mono font-bold" :class="it.availableQuantity <= 0 ? 'text-danger' : 'text-success'">
                  {{ it.availableQuantity }}
                </td>
                <td class="text-right font-mono">{{ formatCurrency(it.purchasePrice) }}</td>
                <td class="text-right font-mono">{{ formatCurrency(it.salePrice) }}</td>
                <td class="text-right font-mono font-bold text-primary">{{ formatCurrency(it.costValue) }}</td>
                <td class="text-center">
                  <span v-if="it.isLowStock" class="badge-danger">Alerte Stock</span>
                  <span v-else class="badge-ok">OK</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- TAB 4: AGING RECEIVABLES (BALANCE ÂGÉE DES CRÉANCES)          -->
    <!-- ============================================================== -->
    <div v-else-if="currentTab === 'receivables' && reportStore.receivables" class="tab-content">
      <!-- Summary Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-lbl">Total Créances Clients</span>
          <span class="metric-val text-danger">{{ formatCurrency(reportStore.receivables.summary.totalDebt) }}</span>
          <div class="metric-sub">{{ reportStore.receivables.summary.debtorCount }} client(s) avec solde débiteur</div>
        </div>

        <div class="metric-card">
          <span class="metric-lbl">Total Plafonds Autorisés</span>
          <span class="metric-val text-dark">{{ formatCurrency(reportStore.receivables.summary.totalCreditLimit) }}</span>
          <div class="metric-sub">Plafond global de crédit consenti</div>
        </div>

        <div class="metric-card">
          <span class="metric-lbl">Taux d'Utilisation Global</span>
          <span class="metric-val text-primary">{{ reportStore.receivables.summary.globalUtilizationRate }} %</span>
          <div class="metric-sub">Ratio endettement / crédit total</div>
        </div>

        <div class="metric-card">
          <span class="metric-lbl">Créances à Risque (+60j & +90j)</span>
          <span class="metric-val text-danger">
            {{ formatCurrency(reportStore.receivables.summary.buckets.days61to90 + reportStore.receivables.summary.buckets.over90Days) }}
          </span>
          <div class="metric-sub">Contentieux et retards critiques</div>
        </div>
      </div>

      <!-- Aging Buckets Visual Progression -->
      <div class="aging-buckets-card">
        <h3>Répartition Temporelle de l'Encours Client</h3>
        <div class="buckets-grid">
          <div class="bucket-box box-green">
            <span class="b-title">0 à 30 Jours (Normal)</span>
            <span class="b-val">{{ formatCurrency(reportStore.receivables.summary.buckets.current0to30) }}</span>
            <span class="b-percent">{{ getBucketPercent(reportStore.receivables.summary.buckets.current0to30) }} %</span>
          </div>

          <div class="bucket-box box-yellow">
            <span class="b-title">31 à 60 Jours (Retard Léger)</span>
            <span class="b-val">{{ formatCurrency(reportStore.receivables.summary.buckets.days31to60) }}</span>
            <span class="b-percent">{{ getBucketPercent(reportStore.receivables.summary.buckets.days31to60) }} %</span>
          </div>

          <div class="bucket-box box-orange">
            <span class="b-title">61 à 90 Jours (Retard Important)</span>
            <span class="b-val">{{ formatCurrency(reportStore.receivables.summary.buckets.days61to90) }}</span>
            <span class="b-percent">{{ getBucketPercent(reportStore.receivables.summary.buckets.days61to90) }} %</span>
          </div>

          <div class="bucket-box box-red">
            <span class="b-title">+ 90 Jours (Contentieux)</span>
            <span class="b-val">{{ formatCurrency(reportStore.receivables.summary.buckets.over90Days) }}</span>
            <span class="b-percent">{{ getBucketPercent(reportStore.receivables.summary.buckets.over90Days) }} %</span>
          </div>
        </div>
      </div>

      <!-- Export & Filter -->
      <div class="filters-card">
        <div class="filter-inputs">
          <div class="form-group search-group">
            <label>Rechercher un client débiteur :</label>
            <input
              type="text"
              v-model="debtorSearchQuery"
              placeholder="Code CLT, nom entreprise, téléphone..."
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label>Niveau de risque :</label>
            <select v-model="selectedRiskFilter" class="form-control">
              <option value="ALL">Tous les niveaux</option>
              <option value="HIGH">Risque élevé (+90 jours)</option>
              <option value="MEDIUM">Risque modéré (61-90 jours)</option>
              <option value="NORMAL">Normal (0-60 jours)</option>
            </select>
          </div>
        </div>

        <button
          class="btn btn-export"
          :disabled="reportStore.downloading"
          @click="reportStore.downloadExcelReport('receivables')"
        >
          📥 {{ reportStore.downloading ? 'Téléchargement...' : 'Exporter Balance Âgée (.xlsx)' }}
        </button>
      </div>

      <!-- Receivables Table -->
      <div class="section-card">
        <div class="table-responsive">
          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 120px;">Code Client</th>
                <th>Raison Sociale / Client</th>
                <th style="width: 120px;">Wilaya</th>
                <th class="text-right" style="width: 130px;">Plafond</th>
                <th class="text-right" style="width: 140px;">Solde Dû</th>
                <th class="text-right" style="width: 120px;">0 - 30 j</th>
                <th class="text-right" style="width: 120px;">31 - 60 j</th>
                <th class="text-right" style="width: 120px;">61 - 90 j</th>
                <th class="text-right" style="width: 130px;">+ 90 j</th>
                <th style="width: 110px; text-align: center;">Niveau Risque</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in filteredDebtors" :key="c.id">
                <td class="font-mono font-bold">
                  <router-link :to="'/admin/clients/' + c.id + '/ledger'" class="client-link">
                    {{ c.code || 'CLT-' + c.id }}
                  </router-link>
                </td>
                <td>
                  <strong>{{ c.name }}</strong>
                  <div class="sub-phone">{{ c.phone || 'Sans contact' }}</div>
                </td>
                <td>{{ c.wilaya || '—' }}</td>
                <td class="text-right font-mono">{{ formatCurrency(c.creditLimit) }}</td>
                <td class="text-right font-mono font-bold text-danger">{{ formatCurrency(c.currentBalance) }}</td>
                <td class="text-right font-mono">{{ c.aging.current0to30 > 0 ? formatCurrency(c.aging.current0to30) : '—' }}</td>
                <td class="text-right font-mono" :class="{ 'text-warning font-bold': c.aging.days31to60 > 0 }">
                  {{ c.aging.days31to60 > 0 ? formatCurrency(c.aging.days31to60) : '—' }}
                </td>
                <td class="text-right font-mono" :class="{ 'text-danger font-bold': c.aging.days61to90 > 0 }">
                  {{ c.aging.days61to90 > 0 ? formatCurrency(c.aging.days61to90) : '—' }}
                </td>
                <td class="text-right font-mono font-bold" :class="{ 'text-danger': c.aging.over90Days > 0 }">
                  {{ c.aging.over90Days > 0 ? formatCurrency(c.aging.over90Days) : '—' }}
                </td>
                <td class="text-center">
                  <span class="risk-badge" :class="'risk-' + c.riskLevel.toLowerCase()">
                    {{ c.riskLevel === 'HIGH' ? 'Critique' : (c.riskLevel === 'MEDIUM' ? 'Surveillance' : 'Normal') }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useReportStore } from '../../stores/report.store';

const reportStore = useReportStore();

const currentTab = ref<'kpis' | 'pnl' | 'stock' | 'receivables'>('kpis');

// P&L Date filters
const currentYear = new Date().getFullYear();
const pnlFromDate = ref(`${currentYear}-01-01`);
const pnlToDate = ref(`${currentYear}-12-31`);

// Stock filters
const stockSelectedCategory = ref('ALL');
const stockSearchQuery = ref('');
const filterLowStockOnly = ref(false);

// Receivables filters
const debtorSearchQuery = ref('');
const selectedRiskFilter = ref('ALL');

onMounted(() => {
  reportStore.fetchDashboardKpis();
});

async function switchTab(tab: 'kpis' | 'pnl' | 'stock' | 'receivables') {
  currentTab.value = tab;
  if (tab === 'pnl' && !reportStore.incomeStatement) {
    await reportStore.fetchIncomeStatement(pnlFromDate.value, pnlToDate.value);
  } else if (tab === 'stock' && !reportStore.stockValuation) {
    await reportStore.fetchStockValuation();
  } else if (tab === 'receivables' && !reportStore.receivables) {
    await reportStore.fetchAgingReceivables();
  }
}

async function applyPnlFilter() {
  await reportStore.fetchIncomeStatement(pnlFromDate.value, pnlToDate.value);
}

function setPresetPeriod(preset: 'this-year' | 'this-month' | 'last-month') {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  if (preset === 'this-year') {
    pnlFromDate.value = `${year}-01-01`;
    pnlToDate.value = `${year}-12-31`;
  } else if (preset === 'this-month') {
    const start = new Date(year, month, 1).toISOString().substring(0, 10);
    const end = new Date(year, month + 1, 0).toISOString().substring(0, 10);
    pnlFromDate.value = start;
    pnlToDate.value = end;
  } else if (preset === 'last-month') {
    const start = new Date(year, month - 1, 1).toISOString().substring(0, 10);
    const end = new Date(year, month, 0).toISOString().substring(0, 10);
    pnlFromDate.value = start;
    pnlToDate.value = end;
  }

  applyPnlFilter();
}

const filteredStockItems = computed(() => {
  if (!reportStore.stockValuation) return [];
  return reportStore.stockValuation.items.filter((item) => {
    if (stockSelectedCategory.value !== 'ALL' && item.category !== stockSelectedCategory.value) {
      return false;
    }
    if (filterLowStockOnly.value && !item.isLowStock) {
      return false;
    }
    if (stockSearchQuery.value.trim()) {
      const q = stockSearchQuery.value.toLowerCase();
      const match =
        item.name.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
});

const filteredDebtors = computed(() => {
  if (!reportStore.receivables) return [];
  return reportStore.receivables.clients.filter((c) => {
    if (selectedRiskFilter.value !== 'ALL' && c.riskLevel !== selectedRiskFilter.value) {
      return false;
    }
    if (debtorSearchQuery.value.trim()) {
      const q = debtorSearchQuery.value.toLowerCase();
      const match =
        c.name.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.wilaya && c.wilaya.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
});

function getBucketPercent(amt: number) {
  if (!reportStore.receivables || reportStore.receivables.summary.totalDebt === 0) return 0;
  return Math.round((amt / reportStore.receivables.summary.totalDebt) * 100);
}

function formatCurrency(val: number | string | undefined | null) {
  if (val === undefined || val === null) return '0.00 DZD';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return (
    new Intl.NumberFormat('fr-DZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + ' DZD'
  );
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: 'En attente',
    CONFIRMED: 'Confirmée',
    PREPARING: 'Préparation',
    READY: 'Prête',
    DELIVERED: 'Livrée',
    COMPLETED: 'Clôturée',
    CANCELLED: 'Annulée',
  };
  return map[status] || status;
}

function getCategoryLabel(cat: string) {
  const map: Record<string, string> = {
    RENT: 'Loyer Commercial',
    ELECTRICITY: 'Électricité (Sonelgaz)',
    WATER: 'Eau (Algérienne des Eaux)',
    FUEL: 'Carburant Véhicules & Livraisons',
    MAINTENANCE: 'Entretien & Réparations',
    SUPPLIES: 'Fournitures de Bureau & Emballage',
    TAXES: 'Taxes & Droits Publics',
    MARKETING: 'Publicité & Communication',
    OTHER: 'Autres Frais Généraux',
  };
  return map[cat] || cat;
}
</script>

<style scoped>
.reports-page {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.page-subtitle {
  color: #64748b;
  margin-top: 0.25rem;
  font-size: 0.95rem;
}

.tab-buttons {
  display: flex;
  background: #e2e8f0;
  padding: 0.25rem;
  border-radius: 8px;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.5rem 0.9rem;
  border: none;
  background: transparent;
  font-size: 0.88rem;
  font-weight: 600;
  color: #475569;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: #1e293b;
}

.tab-btn.active {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.metric-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
}

.highlight-card {
  border-color: #bfdbfe;
  background: #f8faff;
}

.metric-lbl {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.metric-val {
  font-size: 1.65rem;
  font-weight: 800;
  margin: 0.35rem 0 0.2rem 0;
}

.metric-sub {
  font-size: 0.82rem;
  color: #94a3b8;
}

.text-primary {
  color: #2563eb;
}

.text-success {
  color: #16a34a;
}

.text-danger {
  color: #dc2626;
}

.text-dark {
  color: #0f172a;
}

.text-info {
  color: #0284c7;
}

.text-muted {
  color: #64748b;
}

.alerts-banner {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.alert-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.alert-item.has-alert {
  border-left: 4px solid #f59e0b;
}

.alert-icon {
  font-size: 1.8rem;
}

.alert-item div {
  flex: 1;
}

.alert-item strong {
  display: block;
  font-size: 0.95rem;
  color: #1e293b;
}

.alert-item p {
  margin: 0.2rem 0 0 0;
  font-size: 0.82rem;
  color: #64748b;
}

.section-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin-bottom: 1.5rem;
}

.card-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

.table-responsive {
  overflow-x: auto;
}

.report-table,
.statement-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
}

.report-table th,
.statement-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.report-table td,
.statement-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.report-table tr:hover {
  background: #f8fafc;
}

/* P&L Waterfall Grid */
.pnl-waterfall-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.waterfall-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
}

.w-lbl {
  font-size: 0.78rem;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
}

.w-val {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0.4rem 0 0.2rem 0;
}

.w-sub {
  font-size: 0.8rem;
  color: #94a3b8;
}

.result-card {
  border-width: 2px;
}

.card-profit {
  border-color: #16a34a;
  background: #f0fdf4;
}

.card-profit .w-val {
  color: #15803d;
}

.card-loss {
  border-color: #dc2626;
  background: #fef2f2;
}

.card-loss .w-val {
  color: #b91c1c;
}

/* Statement Table Rows */
.row-header {
  background: #f1f5f9;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  color: #334155;
}

.row-subtotal {
  background: #f8fafc;
  border-top: 1px solid #cbd5e1;
  border-bottom: 2px solid #cbd5e1;
  font-size: 0.95rem;
}

.highlight-row {
  background: #f0fdf4;
}

.row-grand-total {
  font-size: 1.1rem;
  border-top: 2px solid #0f172a;
}

.profit-bg {
  background: #dcfce7;
  color: #14532d;
}

.loss-bg {
  background: #fee2e2;
  color: #7f1d1d;
}

.result-cell {
  font-size: 1.2rem;
}

.pl-indent {
  padding-left: 2rem !important;
}

/* Filters Card */
.filters-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.date-filters,
.filter-inputs {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.form-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.form-control {
  padding: 0.45rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
  background-color: #fff;
  color: #1e293b;
}

.search-group {
  min-width: 260px;
}

.checkbox-group {
  margin-left: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #334155;
  cursor: pointer;
}

.preset-links {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #94a3b8;
  margin-left: 0.5rem;
}

.btn-link-xs {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  font-size: 0.8rem;
}

.btn-link-xs:hover {
  text-decoration: underline;
}

.btn {
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  border: none;
  transition: background 0.15s;
}

.btn-primary {
  background: #2563eb;
  color: #fff;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-export {
  background: #16a34a;
  color: #fff;
  font-weight: 600;
}

.btn-export:hover {
  background: #15803d;
}

.btn-outline {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #334155;
}

.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

/* Aging Buckets Card */
.aging-buckets-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.aging-buckets-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1.05rem;
  color: #1e293b;
}

.buckets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.bucket-box {
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.box-green {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.box-yellow {
  background: #fefce8;
  border: 1px solid #fef08a;
}

.box-orange {
  background: #fff7ed;
  border: 1px solid #fed7aa;
}

.box-red {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.b-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
}

.b-val {
  font-size: 1.35rem;
  font-weight: 800;
  margin: 0.3rem 0;
  font-family: monospace;
}

.b-percent {
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
}

/* Status & Risk Badges */
.status-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.status-delivered,
.status-completed {
  background: #dcfce7;
  color: #15803d;
}

.status-ready {
  background: #e0e7ff;
  color: #4338ca;
}

.status-pending {
  background: #fef3c7;
  color: #b45309;
}

.status-cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.risk-badge {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 700;
}

.risk-normal {
  background: #dcfce7;
  color: #15803d;
}

.risk-medium {
  background: #fef3c7;
  color: #b45309;
}

.risk-high {
  background: #fee2e2;
  color: #dc2626;
}

.badge-danger {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
}

.badge-ok {
  background: #f1f5f9;
  color: #64748b;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.category-pill {
  display: inline-block;
  background: #f1f5f9;
  color: #334155;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.client-code {
  display: block;
  font-size: 0.75rem;
  color: #94a3b8;
}

.sub-phone {
  font-size: 0.78rem;
  color: #64748b;
}

.client-link {
  color: #2563eb;
  text-decoration: none;
}

.client-link:hover {
  text-decoration: underline;
}

.badge-period {
  background: #eff6ff;
  color: #1e40af;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  font-size: 0.82rem;
  font-weight: 600;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.font-bold {
  font-weight: 700;
}

.text-right {
  text-align: right;
}

.text-center {
  text-align: center;
}

.loading-state {
  padding: 3rem;
  text-align: center;
  color: #64748b;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

