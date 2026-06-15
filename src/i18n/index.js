// ─── Translations ─────────────────────────────────────────────────────────────

const TRANSLATIONS = {
  en: {
    // Header
    'header.subtitle': 'Accessibility Scanner',

    // Navigation tabs
    'tab.scan': 'Scan',
    'tab.tools': 'Tools',
    'tab.settings': 'Settings',
    'tab.about': 'About',
    'nav.label': 'Panel',

    // Scan panel
    'scan.btn': 'Run accessibility scan',
    'scan.btn.scanning': 'Scanning…',
    'scan.noTab': 'No active tab found.',
    'scan.noPage': 'Could not reach the page. Check that the URL is not a browser-internal page.',
    'scan.failed': 'Scan failed with an unknown error.',

    // Context area
    'ctx.notConfigured': 'Connect CheckFox in Settings to sync scan results with your audits.',
    'ctx.goToSettings': 'Go to Settings',
    'ctx.loading': 'Matching audit…',
    'ctx.invalidKey': 'Invalid API key. Check Settings.',
    'ctx.cantReach': 'Could not reach CheckFox. Check Settings.',
    'ctx.badge.match': 'Match',
    'ctx.btn.change': 'Change',
    'ctx.btn.pull': 'Pull findings',
    'ctx.btn.push': 'Push scan ↑',
    'ctx.btn.pulling': 'Loading…',
    'ctx.btn.pushing': 'Pushing…',
    'ctx.btn.retry': 'Retry',
    'ctx.noMatch': 'No sample matches this URL. Select manually:',
    'ctx.changeAudit': 'Change audit / sample:',
    'ctx.label.audit': 'Audit',
    'ctx.label.sample': 'Sample',
    'ctx.placeholder.audit': 'Select an audit…',
    'ctx.placeholder.sample': 'Select a sample…',
    'ctx.error.pull': 'Could not fetch findings.',
    'ctx.error.push': 'Push failed.',

    // Findings panel
    'findings.title': 'Existing findings',
    'findings.close': 'Close findings',
    'findings.empty': 'No findings recorded yet.',
    'findings.label': 'Existing findings',

    // Push result (functions)
    'push.result': (applied, skipped) => skipped > 0
      ? `${applied} criteria pre-filled, ${skipped} skipped (already assessed).`
      : `${applied} criteria pre-filled.`,

    // Topic N/A inventory
    'inv.heading': 'Topic N/A inventory',
    'inv.intro': 'Detect topics with no relevant elements on this page and mark them Not Applicable.',
    'inv.btn.detect': 'Detect empty topics',
    'inv.btn.detecting': 'Detecting…',
    'inv.btn.mark': 'Mark selected as N/A ↑',
    'inv.btn.marking': 'Marking…',
    'inv.found': (n) => `${n} topic${n > 1 ? 's' : ''} with no elements — review and confirm:`,
    'inv.none': 'All detectable topics have elements on this page — nothing to mark N/A.',
    'inv.notApplicableGuideline': 'Topic N/A inventory is only available for RGAA and RAWeb audits.',
    'inv.selectFirst': 'Select an audit and sample first.',
    'inv.noSelection': 'Select at least one topic.',
    'inv.noCriteria': 'No matching criteria found for the selected topics in this audit.',
    'inv.error': 'Could not run the inventory.',
    'inv.reason': 'No relevant elements found on the sample page (auto-detected by CheckFox).',
    'inv.result': (applied, skipped) => skipped > 0
      ? `${applied} criteria marked N/A, ${skipped} skipped (already assessed).`
      : `${applied} criteria marked N/A.`,
    'inv.topicLine': (num, name, crit) => `Topic ${num} · ${name} — 0 elements (${crit} criteria)`,
    'inv.topic.images': 'Images',
    'inv.topic.frames': 'Frames',
    'inv.topic.multimedia': 'Multimedia',
    'inv.topic.tables': 'Tables',
    'inv.topic.links': 'Links',
    'inv.topic.forms': 'Forms',

    // Settings — Connection
    'settings.connection.heading': 'CheckFox Connection',
    'settings.apikey.label': 'API Key',
    'settings.apikey.placeholder': 'cfx_live_…',
    'settings.apikey.show': 'Show',
    'settings.apikey.hide': 'Hide',
    'settings.apikey.ariaShow': 'Show API key',
    'settings.apikey.ariaHide': 'Hide API key',
    'settings.save': 'Save & Connect',
    'settings.save.connecting': 'Connecting…',
    'settings.save.connected': 'Connected! Reopen the popup to sync with your audits.',
    'settings.save.error.status': (status) => `Connection failed (${status}). Check your API key.`,
    'settings.save.error.network': 'Connection failed. Check your network.',
    'settings.apikey.required': 'API key is required.',

    // Settings — Display
    'settings.display.heading': 'Display',
    'settings.sidebar.label': 'Open as sidebar',
    'settings.sidebar.hint': 'When on, the extension icon opens a persistent side panel instead of a popup.',

    // Settings — Language
    'settings.language.heading': 'Language',
    'settings.language.label': 'Interface language',

    // About panel
    'about.whatIs.heading': 'What is CheckFox?',
    'about.whatIs.text': 'CheckFox is a browser extension for auditing web accessibility. It combines automated scanning with visual debugging tools to help identify and fix barriers for users with disabilities.',
    'about.engine.heading': 'Scan engine',
    'about.engine.axe.desc': 'Industry-standard WCAG rule engine by Deque. Powers the Scan tab — runs automated checks against WCAG 2.x success criteria.',
    'about.engine.custom.name': 'Custom scanners',
    'about.engine.custom.desc': 'CheckFox-specific rules that extend axe-core results with RGAA and RAWeb criteria mappings.',
    'about.inspiration.heading': 'Visual tools inspiration',
    'about.inspiration.text': 'The Tools tab uses CSS- and JS-based highlighting techniques inspired by these open-source projects:',
    'about.source.lint.desc': 'Uses pure CSS selectors to surface structural HTML issues directly on the page.',
    'about.source.a11ycss.desc': 'A diagnostic stylesheet that highlights accessibility errors, warnings, and best-practice deviations via CSS.',
    'about.source.by': 'by',

    // Footer
    'footer.text': 'Made for the accessibility toolset',

    // Tools panel — header subtitle
    'tools.selected': (count) => `${count} tool${count !== 1 ? 's' : ''} selected`,
    'tools.deselectAll': 'Deselect all',

    // Tools panel — custom CSS
    'tool.custom.apply': 'Apply',
    'tool.custom.ariaLabel': 'Custom CSS',
    'tool.toggle.ariaLabel': (label) => `Toggle ${label}`,

    // Tool groups
    'group.Images': 'Images',
    'group.Frames': 'Frames',
    'group.Tables': 'Tables',
    'group.Links': 'Links',
    'group.Scripts': 'Scripts',
    'group.Mandatory elements': 'Mandatory elements',
    'group.Information structure': 'Information structure',
    'group.Presentation of information': 'Presentation of information',
    'group.Forms': 'Forms',
    'group.Navigation': 'Navigation',
    'group.Consultation': 'Consultation',
    'group.Custom': 'Custom',

    // Tool labels & descriptions
    'tool.images.label': 'Images',
    'tool.images.description': 'Shows alt text on each image and outlines by accessibility status',
    'tool.frames.label': 'Frames & iframes',
    'tool.frames.description': 'Show frame and iframe title attributes',
    'tool.tables.label': 'Tables',
    'tool.tables.description': 'Highlight tables, headers, captions and scope attributes',
    'tool.links.label': 'Links',
    'tool.links.description': 'Audit link types, accessible names and hidden children',
    'tool.aria.label': 'ARIA roles & states',
    'tool.aria.description': 'Show ARIA roles and state/property attributes',
    'tool.status.label': 'Status messages',
    'tool.status.description': 'Show live regions and ARIA status roles',
    'tool.dp-button.label': 'Design-pattern buttons (7.1)',
    'tool.dp-button.description': 'Highlight scripted role="button" controls and check focusability and accessible name',
    'tool.dp-button.legend.0': 'focusable + named — verify key handling',
    'tool.dp-button.legend.1': 'not keyboard-focusable',
    'tool.dp-button.legend.2': 'no accessible name',
    'tool.dp-button.legend.3': 'aria-disabled',
    'tool.lang.label': 'Language',
    'tool.lang.description': 'Show lang and dir attribute values on all elements',
    'tool.tag-misuse.label': 'Tag misuse',
    'tool.tag-misuse.description': 'Detect semantic elements used for visual layout only',
    'tool.headings.label': 'Headings',
    'tool.headings.description': 'Show heading hierarchy and levels',
    'tool.document-structure.label': 'Document structure',
    'tool.document-structure.description': 'Check structural landmark elements for uniqueness and correct use',
    'tool.lists.label': 'Lists',
    'tool.lists.description': 'Show list elements and role overrides',
    'tool.citations.label': 'Citations',
    'tool.citations.description': 'Highlight block and inline quotations',
    'tool.presentation-attrs.label': 'Presentation attributes',
    'tool.presentation-attrs.description': 'Detect deprecated HTML presentation attributes and elements',
    'tool.css-content.label': 'CSS generated content',
    'tool.css-content.description': 'Outline elements with ::before or ::after pseudo-elements carrying content',
    'tool.no-css.label': 'Disable CSS',
    'tool.no-css.description': 'Toggle all page stylesheets off to inspect unstyled structure',
    'tool.focus.label': 'Focus / Tab order',
    'tool.focus.description': 'Highlight focus ring and tabindex values on interactive elements',
    'tool.hidden.label': 'Hidden content',
    'tool.hidden.description': 'Reveal hidden and aria-hidden elements',
    'tool.text-spacing.label': 'Text spacing',
    'tool.text-spacing.description': 'Apply WCAG 1.4.12 text spacing overrides to test reflow',
    'tool.form-labels.label': 'Form labels (11.1)',
    'tool.form-labels.description': 'Check each form field has an accessible label',
    'tool.form-groups.label': 'Form groupings (11.5)',
    'tool.form-groups.description': 'Check related controls are grouped with fieldset or ARIA group role',
    'tool.form-group-names.label': 'Group names (11.6)',
    'tool.form-group-names.description': 'Check each form group has a legend or accessible name',
    'tool.form-buttons.label': 'Button labels (11.9)',
    'tool.form-buttons.description': 'Show the accessible name source for each button',
    'tool.form-autocomplete.label': 'Autocomplete (11.13)',
    'tool.form-autocomplete.description': 'Show autocomplete attribute values on form fields',
    'tool.landmarks.label': 'Landmarks',
    'tool.landmarks.description': 'Highlight ARIA landmark roles and structural elements',
    'tool.office-docs.label': 'Office documents',
    'tool.office-docs.description': 'Highlight links to downloadable office and PDF files',
    'tool.custom.label': 'Custom CSS',
    'tool.custom.description': 'Inject your own CSS into the page',

    // Tool legend labels
    'tool.images.legend.0': 'img — has alt text',
    'tool.images.legend.1': 'img — decorative (alt="")',
    'tool.images.legend.2': 'img — missing alt attribute',
    'tool.images.legend.3': 'svg / role="img" — hidden from AT',
    'tool.form-labels.legend.0': 'label[for] or wrapped in label',
    'tool.form-labels.legend.1': 'aria-label / aria-labelledby',
    'tool.form-labels.legend.2': 'title attribute only',
    'tool.form-labels.legend.3': 'no label found',
    'tool.form-groups.legend.0': 'fieldset element',
    'tool.form-groups.legend.1': 'role="group" / role="radiogroup"',
    'tool.form-groups.legend.2': 'ungrouped radio/checkbox cluster',
    'tool.form-group-names.legend.0': 'group has legend / aria-label',
    'tool.form-group-names.legend.1': 'individual field with grouping context',
    'tool.form-group-names.legend.2': 'group has no accessible name',
    'tool.form-buttons.legend.0': 'aria-label / aria-labelledby',
    'tool.form-buttons.legend.1': 'visible text / value attribute',
    'tool.form-buttons.legend.2': 'title attribute only',
    'tool.form-buttons.legend.3': 'no accessible name',
    'tool.form-autocomplete.legend.0': 'autocomplete value present',
    'tool.form-autocomplete.legend.1': 'autocomplete="off"',
    'tool.form-autocomplete.legend.2': 'no autocomplete attribute',

    // Scan results
    'results.label': 'Scan results',
    'results.filter.label': 'Filter scan results',
    'results.violations': (n) => `${n} violation${n !== 1 ? 's' : ''}`,
    'results.incomplete': (n) => `${n} incomplete`,
    'results.passes': (n) => `${n} pass${n !== 1 ? 'es' : ''}`,
    'results.affected': 'Affected elements',
    'results.learnMore': 'Learn more',
    'results.opensNewTab': ' (opens in new tab)',
    'results.needsReview': 'needs review',

    // Date labels (audit due dates)
    'date.overdue': 'overdue',
    'date.due': 'due',

    // Injected badge strings (page context — passed via args)
    'badge.altMissing':             'ALT MISSING',
    'badge.decorative':             'alt="" (decorative)',
    'badge.noTitle':                'NO TITLE',
    'badge.emptyTitle':             'empty title',
    'badge.useSemantic':            'use <strong>/<em> instead?',
    'badge.deprecated':             'deprecated',
    'badge.semanticRemoved':        'semantic removed',
    'badge.multipleMain':           'MULTIPLE MAIN',
    'badge.duplicate':              'duplicate',
    'badge.wrappedInLabel':         'wrapped in <label>',
    'badge.noLabel':                'NO LABEL',
    'badge.noLegend':               'NO LEGEND',
    'badge.notGrouped':             'not grouped',
    'badge.noAccessibleName':       'NO ACCESSIBLE NAME',
    'badge.noAutocomplete':         'no autocomplete',
    'badge.noRoleMain':             "no role='main'",
    'badge.noRoleBanner':           "no role='banner'",
    'badge.noRoleNav':              "no role='navigation'",
    'badge.noRoleFooter':           "no role='contentinfo'",
    'badge.checkAccessibleVersion': 'check accessible version',
    'badge.badHref':                'bad href',
    'badge.missingHref':            'missing',
    'badge.ariaHiddenInLink':       'aria-hidden inside link',
    'badge.notFocusable':           'NOT FOCUSABLE',
  },

  fr: {
    // Header
    'header.subtitle': 'Analyseur d\'accessibilité',

    // Navigation tabs
    'tab.scan': 'Analyse',
    'tab.tools': 'Outils',
    'tab.settings': 'Paramètres',
    'tab.about': 'À propos',
    'nav.label': 'Panneau',

    // Scan panel
    'scan.btn': 'Lancer l\'analyse d\'accessibilité',
    'scan.btn.scanning': 'Analyse en cours…',
    'scan.noTab': 'Aucun onglet actif trouvé.',
    'scan.noPage': 'Impossible d\'accéder à la page. Vérifiez que l\'URL n\'est pas une page interne du navigateur.',
    'scan.failed': 'L\'analyse a échoué avec une erreur inconnue.',

    // Context area
    'ctx.notConfigured': 'Connectez CheckFox dans les paramètres pour synchroniser les résultats avec vos audits.',
    'ctx.goToSettings': 'Aller aux paramètres',
    'ctx.loading': 'Recherche d\'un audit correspondant…',
    'ctx.invalidKey': 'Clé API invalide. Vérifiez les paramètres.',
    'ctx.cantReach': 'Impossible d\'atteindre CheckFox. Vérifiez les paramètres.',
    'ctx.badge.match': 'Correspondance',
    'ctx.btn.change': 'Modifier',
    'ctx.btn.pull': 'Récupérer les résultats',
    'ctx.btn.push': 'Envoyer l\'analyse ↑',
    'ctx.btn.pulling': 'Chargement…',
    'ctx.btn.pushing': 'Envoi en cours…',
    'ctx.btn.retry': 'Réessayer',
    'ctx.noMatch': 'Aucun échantillon ne correspond à cette URL. Sélectionnez manuellement :',
    'ctx.changeAudit': 'Modifier l\'audit / l\'échantillon :',
    'ctx.label.audit': 'Audit',
    'ctx.label.sample': 'Échantillon',
    'ctx.placeholder.audit': 'Sélectionnez un audit…',
    'ctx.placeholder.sample': 'Sélectionnez un échantillon…',
    'ctx.error.pull': 'Impossible de récupérer les résultats.',
    'ctx.error.push': 'Échec de l\'envoi.',

    // Findings panel
    'findings.title': 'Résultats existants',
    'findings.close': 'Fermer les résultats',
    'findings.empty': 'Aucun résultat enregistré.',
    'findings.label': 'Résultats existants',

    // Push result (functions)
    'push.result': (applied, skipped) => skipped > 0
      ? `${applied} critères pré-remplis, ${skipped} ignorés (déjà évalués).`
      : `${applied} critères pré-remplis.`,

    // Inventaire thématiques N/A
    'inv.heading': 'Inventaire thématiques N/A',
    'inv.intro': 'Détecte les thématiques sans élément pertinent sur la page et les marque Non Applicable.',
    'inv.btn.detect': 'Détecter les thématiques vides',
    'inv.btn.detecting': 'Détection…',
    'inv.btn.mark': 'Marquer la sélection N/A ↑',
    'inv.btn.marking': 'Envoi…',
    'inv.found': (n) => `${n} thématique${n > 1 ? 's' : ''} sans élément — vérifiez et confirmez :`,
    'inv.none': 'Toutes les thématiques détectables ont des éléments sur cette page — rien à marquer N/A.',
    'inv.notApplicableGuideline': 'L\'inventaire thématiques N/A n\'est disponible que pour les audits RGAA et RAWeb.',
    'inv.selectFirst': 'Sélectionnez d\'abord un audit et un échantillon.',
    'inv.noSelection': 'Sélectionnez au moins une thématique.',
    'inv.noCriteria': 'Aucun critère correspondant aux thématiques sélectionnées dans cet audit.',
    'inv.error': 'Impossible d\'exécuter l\'inventaire.',
    'inv.reason': 'Aucun élément pertinent trouvé sur la page de l\'échantillon (détecté automatiquement par CheckFox).',
    'inv.result': (applied, skipped) => skipped > 0
      ? `${applied} critères marqués N/A, ${skipped} ignorés (déjà évalués).`
      : `${applied} critères marqués N/A.`,
    'inv.topicLine': (num, name, crit) => `Thématique ${num} · ${name} — 0 élément (${crit} critères)`,
    'inv.topic.images': 'Images',
    'inv.topic.frames': 'Cadres',
    'inv.topic.multimedia': 'Multimédia',
    'inv.topic.tables': 'Tableaux',
    'inv.topic.links': 'Liens',
    'inv.topic.forms': 'Formulaires',

    // Settings — Connection
    'settings.connection.heading': 'Connexion CheckFox',
    'settings.apikey.label': 'Clé API',
    'settings.apikey.placeholder': 'cfx_live_…',
    'settings.apikey.show': 'Afficher',
    'settings.apikey.hide': 'Masquer',
    'settings.apikey.ariaShow': 'Afficher la clé API',
    'settings.apikey.ariaHide': 'Masquer la clé API',
    'settings.save': 'Enregistrer et connecter',
    'settings.save.connecting': 'Connexion en cours…',
    'settings.save.connected': 'Connecté ! Rouvrez la fenêtre pour synchroniser vos audits.',
    'settings.save.error.status': (status) => `Échec de la connexion (${status}). Vérifiez votre clé API.`,
    'settings.save.error.network': 'Échec de la connexion. Vérifiez votre réseau.',
    'settings.apikey.required': 'La clé API est obligatoire.',

    // Settings — Display
    'settings.display.heading': 'Affichage',
    'settings.sidebar.label': 'Ouvrir en panneau latéral',
    'settings.sidebar.hint': 'Lorsqu\'activé, l\'icône de l\'extension ouvre un panneau latéral persistant plutôt qu\'une fenêtre.',

    // Settings — Language
    'settings.language.heading': 'Langue',
    'settings.language.label': 'Langue de l\'interface',

    // About panel
    'about.whatIs.heading': 'Qu\'est-ce que CheckFox ?',
    'about.whatIs.text': 'CheckFox est une extension de navigateur pour auditer l\'accessibilité web. Elle combine l\'analyse automatisée et des outils de débogage visuel pour aider à identifier et corriger les obstacles pour les utilisateurs en situation de handicap.',
    'about.engine.heading': 'Moteur d\'analyse',
    'about.engine.axe.desc': 'Moteur de règles WCAG standard du secteur par Deque. Alimente l\'onglet Analyse — exécute des vérifications automatisées selon les critères de succès WCAG 2.x.',
    'about.engine.custom.name': 'Analyseurs personnalisés',
    'about.engine.custom.desc': 'Règles spécifiques à CheckFox qui enrichissent les résultats axe-core avec les correspondances aux critères RGAA et RAWeb.',
    'about.inspiration.heading': 'Inspiration des outils visuels',
    'about.inspiration.text': 'L\'onglet Outils utilise des techniques de mise en évidence CSS et JS inspirées de ces projets open source :',
    'about.source.lint.desc': 'Utilise des sélecteurs CSS purs pour mettre en évidence directement les problèmes de structure HTML sur la page.',
    'about.source.a11ycss.desc': 'Une feuille de style de diagnostic qui met en évidence les erreurs d\'accessibilité, les avertissements et les déviations de bonnes pratiques via CSS.',
    'about.source.by': 'par',

    // Footer
    'footer.text': 'Créé pour la boîte à outils d\'accessibilité',

    // Tools panel — header subtitle
    'tools.selected': (count) => `${count} outil${count !== 1 ? 's' : ''} sélectionné${count !== 1 ? 's' : ''}`,
    'tools.deselectAll': 'Tout désélectionner',

    // Tools panel — custom CSS
    'tool.custom.apply': 'Appliquer',
    'tool.custom.ariaLabel': 'CSS personnalisé',
    'tool.toggle.ariaLabel': (label) => `Activer/désactiver ${label}`,

    // Tool groups
    'group.Images': 'Images',
    'group.Frames': 'Cadres',
    'group.Tables': 'Tableaux',
    'group.Links': 'Liens',
    'group.Scripts': 'Scripts',
    'group.Mandatory elements': 'Éléments obligatoires',
    'group.Information structure': 'Structure de l\'information',
    'group.Presentation of information': 'Présentation de l\'information',
    'group.Forms': 'Formulaires',
    'group.Navigation': 'Navigation',
    'group.Consultation': 'Consultation',
    'group.Custom': 'Personnalisé',

    // Tool labels & descriptions
    'tool.images.label': 'Images',
    'tool.images.description': 'Affiche le texte alternatif de chaque image et les contours selon le statut d\'accessibilité',
    'tool.frames.label': 'Cadres & iframes',
    'tool.frames.description': 'Affiche les attributs title des éléments frame et iframe',
    'tool.tables.label': 'Tableaux',
    'tool.tables.description': 'Met en évidence les tableaux, les en-têtes, les légendes et les attributs scope',
    'tool.links.label': 'Liens',
    'tool.links.description': 'Audite les types de liens, les noms accessibles et les enfants masqués',
    'tool.aria.label': 'Rôles & états ARIA',
    'tool.aria.description': 'Affiche les rôles ARIA et les attributs d\'état/propriété',
    'tool.status.label': 'Messages de statut',
    'tool.status.description': 'Affiche les régions live et les rôles de statut ARIA',
    'tool.dp-button.label': 'Boutons (design pattern) (7.1)',
    'tool.dp-button.description': 'Met en évidence les contrôles role="button" scriptés et vérifie le focus clavier et le nom accessible',
    'tool.dp-button.legend.0': 'focusable + nommé — vérifier la gestion clavier',
    'tool.dp-button.legend.1': 'non focusable au clavier',
    'tool.dp-button.legend.2': 'aucun nom accessible',
    'tool.dp-button.legend.3': 'aria-disabled',
    'tool.lang.label': 'Langue',
    'tool.lang.description': 'Affiche les valeurs des attributs lang et dir sur tous les éléments',
    'tool.tag-misuse.label': 'Mauvaise utilisation des balises',
    'tool.tag-misuse.description': 'Détecte les éléments sémantiques utilisés uniquement pour la mise en page visuelle',
    'tool.headings.label': 'Titres',
    'tool.headings.description': 'Affiche la hiérarchie et les niveaux de titres',
    'tool.document-structure.label': 'Structure du document',
    'tool.document-structure.description': 'Vérifie l\'unicité et l\'utilisation correcte des éléments de structure',
    'tool.lists.label': 'Listes',
    'tool.lists.description': 'Affiche les éléments de liste et les remplacements de rôle',
    'tool.citations.label': 'Citations',
    'tool.citations.description': 'Met en évidence les citations de bloc et en ligne',
    'tool.presentation-attrs.label': 'Attributs de présentation',
    'tool.presentation-attrs.description': 'Détecte les attributs et éléments HTML de présentation obsolètes',
    'tool.css-content.label': 'Contenu généré par CSS',
    'tool.css-content.description': 'Contourne les pseudo-éléments ::before ou ::after portant du contenu',
    'tool.no-css.label': 'Désactiver le CSS',
    'tool.no-css.description': 'Désactive toutes les feuilles de style de la page pour inspecter la structure brute',
    'tool.focus.label': 'Focus / Ordre de tabulation',
    'tool.focus.description': 'Met en évidence l\'anneau de focus et les valeurs tabindex sur les éléments interactifs',
    'tool.hidden.label': 'Contenu masqué',
    'tool.hidden.description': 'Révèle les éléments hidden et aria-hidden',
    'tool.text-spacing.label': 'Espacement du texte',
    'tool.text-spacing.description': 'Applique les surcharges d\'espacement de texte WCAG 1.4.12 pour tester le reflow',
    'tool.form-labels.label': 'Libellés de champs (11.1)',
    'tool.form-labels.description': 'Vérifie que chaque champ de formulaire a un libellé accessible',
    'tool.form-groups.label': 'Regroupements (11.5)',
    'tool.form-groups.description': 'Vérifie le regroupement des contrôles liés par fieldset ou rôle ARIA group',
    'tool.form-group-names.label': 'Noms de groupe (11.6)',
    'tool.form-group-names.description': 'Vérifie que chaque groupe a une légende ou un nom accessible',
    'tool.form-buttons.label': 'Libellés des boutons (11.9)',
    'tool.form-buttons.description': 'Affiche la source du nom accessible de chaque bouton',
    'tool.form-autocomplete.label': 'Autocomplétion (11.13)',
    'tool.form-autocomplete.description': 'Affiche les attributs autocomplete sur les champs de formulaire',
    'tool.landmarks.label': 'Points de repère',
    'tool.landmarks.description': 'Met en évidence les rôles de landmark ARIA et les éléments structurels',
    'tool.office-docs.label': 'Documents Office',
    'tool.office-docs.description': 'Met en évidence les liens vers les fichiers Office et PDF téléchargeables',
    'tool.custom.label': 'CSS personnalisé',
    'tool.custom.description': 'Injectez votre propre CSS dans la page',

    // Tool legend labels
    'tool.images.legend.0': 'img — a un texte alternatif',
    'tool.images.legend.1': 'img — décoratif (alt="")',
    'tool.images.legend.2': 'img — attribut alt manquant',
    'tool.images.legend.3': 'svg / role="img" — masqué aux AT',
    'tool.form-labels.legend.0': 'label[for] ou encapsulé dans label',
    'tool.form-labels.legend.1': 'aria-label / aria-labelledby',
    'tool.form-labels.legend.2': 'attribut title uniquement',
    'tool.form-labels.legend.3': 'aucun libellé trouvé',
    'tool.form-groups.legend.0': 'élément fieldset',
    'tool.form-groups.legend.1': 'role="group" / role="radiogroup"',
    'tool.form-groups.legend.2': 'groupe radio/case non regroupé',
    'tool.form-group-names.legend.0': 'groupe avec légende / aria-label',
    'tool.form-group-names.legend.1': 'champ individuel avec contexte de groupe',
    'tool.form-group-names.legend.2': 'groupe sans nom accessible',
    'tool.form-buttons.legend.0': 'aria-label / aria-labelledby',
    'tool.form-buttons.legend.1': 'texte visible / attribut value',
    'tool.form-buttons.legend.2': 'attribut title uniquement',
    'tool.form-buttons.legend.3': 'aucun nom accessible',
    'tool.form-autocomplete.legend.0': 'valeur autocomplete présente',
    'tool.form-autocomplete.legend.1': 'autocomplete="off"',
    'tool.form-autocomplete.legend.2': 'aucun attribut autocomplete',

    // Scan results
    'results.label': 'Résultats de l\'analyse',
    'results.filter.label': 'Filtrer les résultats',
    'results.violations': (n) => `${n} violation${n !== 1 ? 's' : ''}`,
    'results.incomplete': (n) => `${n} incomplet${n !== 1 ? 's' : ''}`,
    'results.passes': (n) => `${n} réussi${n !== 1 ? 's' : ''}`,
    'results.affected': 'Éléments concernés',
    'results.learnMore': 'En savoir plus',
    'results.opensNewTab': ' (s\'ouvre dans un nouvel onglet)',
    'results.needsReview': 'à vérifier',

    // Date labels (audit due dates)
    'date.overdue': 'en retard',
    'date.due': 'échéance',

    // Injected badge strings (page context — passed via args)
    'badge.altMissing':             'ALT MANQUANT',
    'badge.decorative':             'alt="" (décoratif)',
    'badge.noTitle':                'PAS DE TITLE',
    'badge.emptyTitle':             'title vide',
    'badge.useSemantic':            'utiliser <strong>/<em> à la place ?',
    'badge.deprecated':             'déprécié',
    'badge.semanticRemoved':        'sémantique supprimée',
    'badge.multipleMain':           'PLUSIEURS MAIN',
    'badge.duplicate':              'doublon',
    'badge.wrappedInLabel':         'encapsulé dans <label>',
    'badge.noLabel':                'PAS DE LIBELLÉ',
    'badge.noLegend':               'PAS DE LEGEND',
    'badge.notGrouped':             'non regroupé',
    'badge.noAccessibleName':       'PAS DE NOM ACCESSIBLE',
    'badge.noAutocomplete':         'pas d\'autocomplete',
    'badge.noRoleMain':             "pas de role='main'",
    'badge.noRoleBanner':           "pas de role='banner'",
    'badge.noRoleNav':              "pas de role='navigation'",
    'badge.noRoleFooter':           "pas de role='contentinfo'",
    'badge.checkAccessibleVersion': 'vérifier la version accessible',
    'badge.badHref':                'href incorrect',
    'badge.missingHref':            'manquant',
    'badge.ariaHiddenInLink':       'aria-hidden dans un lien',
    'badge.notFocusable':           'NON FOCUSABLE',
  },
}

// ─── State ────────────────────────────────────────────────────────────────────

let currentLang = 'en'

// ─── Public API ───────────────────────────────────────────────────────────────

export function setLang(lang) {
  currentLang = lang in TRANSLATIONS ? lang : 'en'
}

export function getLang() {
  return currentLang
}

export function t(key, ...args) {
  const val = TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.en?.[key] ?? key
  return typeof val === 'function' ? val(...args) : val
}

export async function loadLang() {
  const { cfx_lang } = await chrome.storage.local.get('cfx_lang')
  setLang(cfx_lang ?? 'en')
  return currentLang
}

export async function saveLang(lang) {
  setLang(lang)
  await chrome.storage.local.set({ cfx_lang: lang })
}
