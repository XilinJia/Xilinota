# Autres fonctionnalités notables

### Carnets virtuels

Habituellement, nous mettons des notes dans des cahiers (ou des dossiers). C'est une manière courante d'organiser les éléments de note. Le problème est bien souvent qu’une note n’appartient guère à une seule catégorie de carnets. Par exemple, faut-il mettre une note sur « voiture de sport » dans le carnet « Sports » ou dans le carnet « Voitures » ? C'est donc avec résignation que nous l'avons mis dans un carnet "plus connexe", "Cars". Heureusement, avec de nombreux outils, nous pouvons utiliser des balises pour faciliter la catégorisation, nous marquons donc la note avec « Sport » et « Voiture », mais cela implique beaucoup de travail manuel pour une grande quantité de notes. Voici donc la fonctionnalité de bloc-notes virtuel pour vous aider.

Pour faire simple, le carnet virtuel peut également être appelé balises automatisées. Pour le moment, les balises sont toujours créées par l'utilisateur, soit en attribuant des balises à une note de la manière habituelle, soit en créant des balises libres. Dites avec le tag "Sport", qui a été attribué manuellement à 8 notes par vos soins, laborieusement. Et comme d'habitude, lorsque vous cliquez sur le tag "Sport", Xilinota affiche les 8 notes liées au tag. Le carnet virtuel va encore plus loin : lorsque vous faites un clic droit (ou sur mobile, appuyez simplement longuement) sur la balise "Sport" et choisissez "Virtuel" dans le menu, Xilinota vous montre maintenant toutes les notes contenant le mot "Sport", 126 notes, dont la note susmentionnée sur les voitures de sport. Alors désormais, le tag « Sport » se comporte comme un carnet contenant la plupart des notes liées au sport. C'est un peu comme faire une recherche, mais le carnet virtuel ici concerne davantage l'organisation que la recherche informelle.

### Sauvegarde automatique quotidienne du fichier DB

À chaque démarrage, Xilinota vérifie l'état du fichier de sauvegarde. S'il date de plus d'un jour, une nouvelle sauvegarde est effectuée. Le fichier sauvegardé est nommé "database.sqlite.bak" et est stocké à côté du fichier de base de données "database.sqlite" dans le répertoire de configuration du profil associé. Sous Linux, cela devrait être : "/home/loginname/.config/xilinota-desktop/" ou un sous-répertoire de celui-ci pour un profil spécifique.

#### Avis spécial et limitations

Cette fonctionnalité est uniquement disponible sur l'application de bureau.

### Améliorations de l'efficacité

Une amélioration de l'efficacité concerne la fréquence de sauvegarde des notes pendant l'édition. Le mécanisme consistait à enregistrer la note éditée dans la base de données à chaque frappe, ce qui semble assez inefficace. Désormais, la note est enregistrée toutes les 60 secondes ou lorsque vous quittez l'éditeur de notes. Les notes inchangées ne sont pas enregistrées.

L'efficacité de l'éditeur est encore améliorée en minimisant les recherches de ressources pendant l'édition.

#### Limitations

L'éditeur de texte enrichi n'est actuellement pas pris en charge.