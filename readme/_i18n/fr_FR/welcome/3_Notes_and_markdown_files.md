# Fichiers de notes et de démarques

La croyance centrale de cette fonctionnalité est que les notes sont vos propriétés précieuses, probablement une extension de votre esprit. Xilinota conserve les notes et les cahiers dans une structure de fichiers simple, avec des notes stockées dans des fichiers markdown ayant chacun le titre comme nom de fichier. Les fichiers et dossiers sont maintenus à jour avec la base de données interne. Cela vous donne un meilleur accès et une meilleure utilisation de vos notes en dehors de Xilinota. Vous pouvez créer, ajouter, modifier ou supprimer des fichiers avec vos outils préférés sur votre système, et le contenu de ces fichiers sera synchronisé dans Xilinota lorsque vous le démarrerez. Et, de toute façon, lorsque vous changez d'avis sur le choix des applications, les notes sont sous forme de texte et vous pouvez facilement adopter de nouvelles façons de gérer.

#### Application de bureau

Sur l'application de bureau, le répertoire personnel par défaut dans lequel les cahiers et les notes sont enregistrés se trouve sous « Xilinotas » sous « Documents » du répertoire personnel de l'utilisateur, dans la notion Linux : « /home/loginname/Documents/Xilinotas/ » (il peut ne pas être personnalisé maintenant). En dessous, vous trouverez des sous-répertoires basés sur votre identifiant de profil. Si vous n'avez pas ajouté de profils supplémentaires, tous les cahiers et notes sont enregistrés dans le sous-répertoire « par défaut ». Les blocs-notes sont organisés sous forme d'arborescences de répertoires et les fichiers de notes se trouvent dans les dossiers de bloc-notes associés. (Remarque, si vous exécutez une version de développement à partir des sources, le répertoire sera "/home/loginname/Documents/XilinotasDev/").

#### Application Android

Le répertoire personnel par défaut sur Android est différent. Sur Android 9 ou version antérieure, le répertoire est "/Android/data/ac.mdiq.xilinota/files/Xilinotas". Sur Android 10 ou version ultérieure, le répertoire est choisi par vous lors du premier démarrage de Xilinota. Ces répertoires ne peuvent pas être modifiés pour le moment. (Avec la version dev, sur Android 9 ou version antérieure, le répertoire est "/Android/data/ac.mdiq.xilinota/files/XilinotasDev".

#### Mécanismes

Au démarrage de Xilinota, lorsque les répertoires personnels n'existent pas, Xilinota les créera et les remplira de sous-répertoires et de fichiers. Si vous avez beaucoup de notes, il y aura une courte attente (avec le bureau Xilinota) une fenêtre contextuelle avec une barre animée indique que la tâche est en cours. Les sous-répertoires sont nommés avec les titres des cahiers. Les fichiers sont nommés avec les titres des notes, comme : "le titre de la note.md". Dans le cas d'une note de tâche, elle est nommée "X - note title.md" (si la tâche n'est pas terminée) ou "V - note title.md" (si la tâche a été terminée). complété).

Tout caractère spécial parmi `?:\"*|/\\<>` dans le titre est supprimé.

Vous pouvez créer, mettre à jour, déplacer, supprimer des notes ou des cahiers dans Xilinota et les fichiers et répertoires sont rapidement mis à jour.

#### Ressources

Les ressources (images ou pièces jointes dans les notes) se trouvent désormais dans le sous-répertoire ".resources" du répertoire de chaque notebook (le sous-répertoire "_resources" est réservé pour une utilisation future). Le fichier Markdown affiché dans la visionneuse externe affiche désormais les ressources associées. Les fichiers de ressources sont copiés lorsque le répertoire "Xilinotas" est rempli pour la première fois et sont enregistrés lors de la modification de la note lorsque des ressources sont ajoutées à la note. Les ressources suivent désormais la note associée, c'est-à-dire que lorsque vous déplacez/supprimez une note, les fichiers de ressources associés seront traités de la même manière.

Les fichiers de ressources sont actuellement copiés depuis le répertoire de configuration de Xilinota, vous avez donc des fichiers en double sur votre système. À l'avenir, il semble plus raisonnable d'avoir les ressources proches des fichiers de notes, j'étudie donc les possibilités de supprimer le répertoire de ressources sous le répertoire de configuration de Xilinota. Mais ce sera à un stade ultérieur.

Les fichiers et dossiers du système de fichiers sont synchronisés avec Xilinota. Le processus se déroule au début de Xilinota. Avec le bureau Xilinota, similaire au premier processus de remplissage de fichiers, une fenêtre contextuelle apparaît avec une barre animée pendant le processus de synchronisation. Dans les applications mobiles, ce processus de synchronisation s'exécute en arrière-plan sans bloquer aucune autre fonction de Xilinota.

Tous les fichiers ou dossiers de notes ajoutés ou supprimés seront synchronisés dans Xilinota. Un fichier de démarque s'il est modifié après la sortie précédente de Xilinota est également synchronisé. L'ajout d'un dossier externe avec des fichiers markdown synchronisera tous les fichiers. La suppression d'un dossier entraîne également la suppression de toutes les notes du dossier de Xilinota après la synchronisation (bien que le bloc-notes correspondant au dossier reste).

Une note positive : si vous supprimez le répertoire personnel, ou le répertoire de profil (par exemple par défaut) sous le répertoire personnel, ou tous les dossiers et fichiers sous le répertoire de profil, Xilinota ne supprimera pas toutes vos notes et cahiers dans la base de données, mais plutôt il remplira à nouveau tout le répertoire personnel.

#### Avis spécial et limitations

Actuellement, le déplacement de dossiers dans le système de fichiers n'est pas synchronisé avec Xilinota. De plus, le déplacement d'une note vers un autre dossier n'est pas pris en charge pour la synchronisation et cela n'est pas encouragé car le déplacement manuel d'un fichier de note peut entraîner des ressources liées sans correspondance. Ces opérations sont donc mieux menées au sein de Xilinota.