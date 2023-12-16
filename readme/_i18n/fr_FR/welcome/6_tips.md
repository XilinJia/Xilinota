# Trucs & Astuces

Les premières notes vous ont donné un aperçu des principales fonctionnalités de Xilinota, mais il peut faire plus. Voir ci-dessous pour certaines de ces fonctionnalités et comment obtenir plus d'aide en utilisant l'application :

## Premiers pas avec Xilinota

Vous pouvez installer l'application et l'exécuter à nouveau, ou, comme elle est compatible avec la base de données de Joplin, vous pouvez également choisir de continuer avec ce que vous avez dans Joplin. Pour ce faire, copiez et renommez simplement les deux répertoires de configuration associés sous (sous Linux) ~/.config en Xilinota et xilinota-desktop, respectivement.

## Web Clipper

![](./WebClipper.png)

Le Web Clipper est une extension de navigateur qui vous permet d'enregistrer des pages Web et des captures d'écran à partir de votre navigateur. Pour commencer à l'utiliser, ouvrez l'application de bureau Xilinota, accédez aux options du Web Clipper et suivez les instructions.

Plus d'infos sur le site officiel : https://joplinapp.org/clipper/

## Plugins

Xilinota prend en charge l'API du plugin Joplin qui vous permet d'ajouter de nouvelles fonctionnalités à l'application, telles que des onglets, une table des matières pour vos notes, un moyen de gérer vos notes préférées et bien d'autres. Pour ajouter un plugin, rendez-vous dans la section "Plugins" de l'écran de configuration. À partir de là, vous pouvez rechercher et installer des plugins, ainsi que rechercher ou mettre à jour des plugins.

## Pièces jointes

Tout type de fichier peut être joint à une note. Dans Markdown, les liens vers ces fichiers sont représentés par un ID. Dans le visualiseur de notes, ces fichiers, s'il s'agit d'images, seront affichés ou, s'il s'agit d'autres fichiers (PDF, fichiers texte, etc.), ils seront affichés sous forme de liens. Cliquer sur ce lien ouvrira le fichier dans l'application par défaut.

Les images peuvent être jointes soit en cliquant sur "Joindre un fichier", soit en collant (avec `Ctrl+V` ou `Cmd+V`) une image directement dans l'éditeur, soit en glissant-déposant une image.

Plus d'infos sur les pièces jointes : https://xilinotaapp.org/help/#attachments

## Recherche

Xilinota prend en charge les requêtes de recherche avancées, qui sont entièrement documentées sur le site officiel : https://xilinotaapp.org/help/#searching

## Alarmes

Une alarme peut être associée à n'importe quelle tâche. Elle sera déclenchée à l'heure indiquée par l'affichage d'une notification. Pour utiliser cette fonctionnalité, consultez la documentation : https://xilinotaapp.org/help/#notifications

## Conseils avancés Markdown

Xilinota utilise et rend [Github-flavored Markdown](https://xilinotaapp.org/markdown/) avec quelques variations et ajouts.

Par exemple, les tableaux sont pris en charge :

| Les tableaux        | Sont           | Cools  |
| ------------- |:-------------:| -----:|
| col 3 est      | alignée à droite | $1600 |
| col 2 est      | centrée      |   $12 |

Vous pouvez également créer des listes de cases à cocher. Ces cases peuvent être cochées directement dans le visualiseur, ou en ajoutant un "x" à l'intérieur :

- [ ] Lait
- [ ] Œufs
- [x] Bière

Des expressions mathématiques peuvent être ajoutées à l'aide de la [notation KaTeX](https://khan.github.io/KaTeX/) :

$$
f(x) = \int_{-\infty}^\infty
     \hat f(\xi)\,e^{2 \pi i \xi x}
     \,d\xi
$$

Diverses autres astuces sont possibles, telles que l'utilisation de HTML ou la personnalisation du CSS. Voir la documentation Markdown pour plus d'informations - https://joplinapp.org/markdown/

## Aide supplémentaire

- Pour une discussion générale sur Xilinota, l'assistance utilisateur, les questions de développement logiciel et pour discuter des nouvelles fonctionnalités, rendez-vous sur le [Forum Xilinota](https://github.com/XilinJia/Xilinota/discussions). Il est possible de vous connecter avec votre compte GitHub.
- Les dernières nouvelles sont publiées [sur la page Patreon](https://www.patreon.com/xilinota).
- Pour les rapports de bogues et les demandes de fonctionnalités, accédez au [GitHub Issue Tracker](https://github.com/XilinJia/Xilinota/issues).

## Donations

Les dons à Xilinota soutiennent le développement du projet. Développer des applications de qualité prend généralement du temps, mais il y a aussi des dépenses, comme les certificats numériques pour signer les applications, les frais d'app store, l'hébergement, etc. Surtout, votre don permettra de maintenir le standard de développement actuel.

Veuillez consulter la [page de don](https://xilinotaapp.org/donate/) pour savoir comment soutenir le développement de Xilinota.