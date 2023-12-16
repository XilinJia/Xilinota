# Synchroniser vos notes

Xilinota prend en charge tous les moyens de synchronisation, notamment Dropbox, Nextcloud, OneDrive ou WebDAV et Joplin Cloud. Pour obtenir des instructions, reportez-vous aux documents Joplin associés.

De plus, Xilinota propose une nouvelle façon de synchroniser vos notes : la synchronisation instantanée.

## Synchronisation instantanée sur tous les appareils

La synchronisation des notes via le cloud, des serveurs externes ou avec l'aide d'une application tierce comme Syncthing peut toujours être utilisée si vous le souhaitez. Xilinota vous propose une nouvelle façon de synchroniser vos notes : une manière instantanée, qui est sûrement plus pratique. Certes, Xilinota fonctionne sur plusieurs plates-formes que vous choisissez, cependant, toutes celles-ci sont destinées à une seule personne : vous, l'utilisateur. Ainsi, la possibilité d’effectuer une synchronisation instantanée supprime le processus de manipulations compliquées. Voici comment cela fonctionne.

Actuellement, cela suppose que vous utilisez votre ordinateur pour effectuer le gros travail de prise de notes et que vos téléphones sont des assistants ou effectuent des tâches occasionnelles. Vous pouvez choisir de conserver seulement une partie ou la totalité des cahiers de votre ordinateur sur n'importe quel téléphone (j'aime que les téléphones soient plus légers et ne conservent pas toutes les notes professionnelles complexes sur lesquelles je travaille sur mon ordinateur, mais vous pouvez faire votre propre choix).

Pour commencer, assurez-vous de définir un même mot de passe privé dans Xilinota sur tous vos appareils. Cela peut être fait dans Options (ou Configuration) -> Application.

Supposons maintenant que vous ayez Notebook1 et Notebook2 sur votre ordinateur et que vous souhaitiez également les conserver sur votre PhoneA. Lorsque l'ordinateur et PhoneA sont sur le même réseau local (ils se connectent automatiquement), vous sélectionnez Notebook1 et Notebook2, faites un clic droit pour obtenir le menu contextuel et choisissez "Envoyer aux pairs". Ensuite, les deux cahiers ainsi que leurs sous-structures et notes sont envoyés à PhoneA. Vous pouvez également faire une chose similaire depuis un téléphone vers un ordinateur ou d’autres appareils. Pour le moment, le taux de transfert est limité à environ 2 notes par seconde, juste pour que le récepteur puisse maintenir la charge de travail.

Désormais, votre ordinateur et PhoneA disposent de Notebook1 et Notebook2. Lorsque vous modifiez et enregistrez une note dans les blocs-notes partagés sur n'importe quel appareil, la note est instantanément synchronisée avec les autres.

Votre ordinateur peut avoir Notebook3 et PhoneA peut avoir PhoneNotes, les modifications dans les blocs-notes non partagés ne sont pas synchronisées. Mais vous pouvez envoyer instantanément des notes de ces blocs-notes non partagés vers d'autres appareils en sélectionnant n'importe quelle note et en choisissant « Envoyer à des pairs » dans le menu contextuel. Les notes reçues seront placées dans un bloc-notes créé automatiquement nommé \_InBox.

Lorsque vous déplacez une note ou un sous-carnet dans un bloc-notes partagé, il sera déplacé en conséquence sur d'autres appareils. Si vous déplacez une note vers un bloc-notes non partagé, elle sera supprimée sur d'autres appareils. Et si vous supprimez une note ou un carnet dans un carnet partagé, il sera également supprimé sur d’autres appareils.

Les opérations hors ligne sur les notes et les blocs-notes sont synchronisées de manière croisée lorsqu'un appareil est connecté à d'autres appareils (avec un ordinateur de bureau comme hub). La synchronisation hors ligne des blocs-notes supprimés est désormais observée et n'est pas activée dans les applications publiées.

L'envoi de blocs-notes depuis le bureau peut être ciblé sur un appareil spécifique ou sur tous.

#### Avis spécial, limitations et tâches à accomplir

Actuellement, rien n’indique si un appareil est connecté à d’autres sur le réseau. La connexion est très instantanée, vous pouvez donc supposer qu'ils sont connectés si vos appareils sont en ligne, que le code d'accès privé est défini avec le même jeton sur tous les appareils et que Xilinota a été démarré sur les appareils. Un moyen d'indication sera ajouté ultérieurement.

L’envoi d’un notebook racine peut prendre un certain temps. Actuellement, il existe une fenêtre contextuelle animée (sur le bureau uniquement) indiquant la tâche en cours (mais pas de rapport de progression), et lorsque la tâche est terminée, la fenêtre contextuelle se ferme. En gros, pour une estimation, il faut par note une demi-seconde de temps d'inactivité (étranglé) plus un peu de temps pour l'envoi. L'envoi ou la synchronisation d'une seule note est instantané et aucune indication de progression n'est nécessaire.

Lors de la synchronisation des notes hors ligne, il n'existe actuellement aucun mécanisme de gestion des conflits (les mêmes notes modifiées sur plusieurs appareils pendant la période hors ligne). Fondamentalement, les notes du dernier appareil synchronisé écrasent les autres, et les notes de l'ordinateur écrasent celles des mobiles.

Les ressources intégrées (images) ne sont ni envoyées ni synchronisées. Je prévois d'effectuer un transfert à la demande lorsqu'une note contenant la ressource est ouverte, et cela n'a pas encore été implémenté.

L'envoi de notes (et l'envoi de blocs-notes depuis un mobile) s'effectuent actuellement vers tous les appareils connectés. Donc, si vous souhaitez envoyer vers un appareil spécifique maintenant, assurez-vous que Xilinota ne fonctionne pas sur d'autres appareils.