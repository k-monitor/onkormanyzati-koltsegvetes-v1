# Költségvetés vizualizáció

*Copyright &copy; 2019 DeepData Ltd.*


## Mi ez?

Ez egy kis mini weboldal, ami megjeleníti egy adott önkormányzat költségvetését. Az egyes tételek kétféle fa struktúrába vannak rendezve: van funkcionális, illetve közgazdasági nézet.

Ha a felhasználó kiválaszt egy főkategóriát a bal oldali menüből, megjelenik az adott kategória alá tartozó fa struktúra egy sávos vizualizációban. Az egyes alkategóriákhoz sávok rajzolódnak ki, ahol a sávok magassága arányos az adott tétel összegével. Az egyes sávokra vagy a hozzájuk kötött címkére kattintva lejjebb lehet lépdelni a fá ágain. A fában felfelé lépdelni a vízszintes sávok bal oldalán található függőleges sávra kattintással, vagy a "kenyérmorzsákkal" lehet, ami a vizualizáció felett helyezkedik el. Utóbbi panel kiírja, éppen melyik ágon tartózkodik a felhasználó.

Ahogy a felhasználó lépdel a fában, a program előzmény elemeket generál a böngészőnek, így a Vissza/Előre gombok segítségével is lehet navigálni a vizualizációban.

A vizualizáció alatt helyet kapott egy doboz, ami hétköznapi példákkal teszi kézzel foghatóvá az éppen kiválasztott kategóriához tartozó összeget. Mellette az adott kategóriához tartozó mérföldkő (hír, esemény, pl. beruházásról) olvasható, melyhez fotó is társul.



## Licensz

**CC-BY-SA 4.0:** https://creativecommons.org/licenses/by-sa/4.0/

Ez az alkotás szabadon felhasználható és módosítható azzal a feltétellel, hogy az eredeti alkotó neve és a változtatások feltüntetésre kerülnek, valamint a fenti licensz alatt marad a módosított termék is.



## Beüzemelés


### Build-elés

A weboldal nagyon hasonló HTML fájlokból áll, a különböző évek költségvetéseihez. Annak érdekében, hogy csak egyetlen helyen kelljen módosításokat végezni, a honlapot Jekyll projektként kell kezelni:

* A lapok felépítését a `_layouts/koltsegvetes.html` fájl írja le.
* Az egyes költségvetések oldalait az évszám nevű mappákban levő `index.html` fájlok írják le - melyek csak behivatkozzák a layout-ot és átadják a paramétereket.
* A honlapot a `jekyll build` paranccsal lehet hosztolható formára hozni.



### Rendszerkövetelmények

Ez egy statikus honlap, egy webszerveren (pl. Apache, nginx) kívül semmi másra nincs szükség a hosztolásához.

Példa konfigurációs fájl Apache-hoz:

```apache
<VirtualHost *:80>
        ServerAdmin person@domain.tld
        ServerName subdomain.domain.tld
        DocumentRoot /var/www/domain.tld/subdomain
        <Directory /var/www/domain.tld/subdomain>
                Options -Indexes
                AllowOverride all
        </Directory>
</VirtualHost>
```



### Cache beállítások

A weboldal gyökerében levő `.htaccess` fájl elején olyan definíciók találhatók, amelyek kikapcsolják a böngészők cache-elését ehhez az oldalhoz, így mindig letöltik az adatokat. Ha minden változtatást (adatok cseréje, stb.) elvégeztünk, érdemes lehet ezt a kódrészletet törölni, és beállítani a fájlok lejáratát, pl.: [https://gtmetrix.com/add-expires-headers.html](https://gtmetrix.com/add-expires-headers.html)



### SEO

Keresőoptimalizálás szempontjából az `_layouts/koltsegvetes.html` fájlban néhány sort módosítani kell, miután a végleges domain mögé kerül a weboldal. Az alábbi sorokban a végleges URL-nek kell szerepelnie:

```html
<head>
	...
	<link rel="canonical" href="http://koltsegvetes-progi.deepdata.hu/">
	<meta property="og:url" content="http://koltsegvetes-progi.deepdata.hu/">
	<meta property="og:image" content="http://koltsegvetes-progi.deepdata.hu/assets/img/og-image.png">
	...
```

Módosítás build-elni kell a Jekyll projektet.


### Adatok

A vizualizáció az adatokat az adott év mappájába elhelyezett fájlokból olvassa be:

```plain
budget.csv
economies.csv
economies_milestones.csv
functions.csv
functions_milestones.csv
```

Módosítás build-elni kell a Jekyll projektet.



#### budget.json

Ez a fájl tartalmazza az összegeket, hozzárendelve mindkét kategóriabontáshoz.

Formátuma CSV, az alábbiak szerint:

* 1. oszlop, 3. sortól kezdve: funkcionális kategóriák azonosítói
* 2. oszlop, 3. sortól kezdve: funkcionális kategóriák elnevezései (nincs használatban, a szerkesztést segíti)
* 1. sor, 3. oszloptól kezdve: közgazdasági kategóriák azonosítói
* 1. sor, 3. oszloptól kezdve: közgazdasági kategóriák elnevezései (nincs használatban, a szerkesztést segíti)
* 3. sortól és 3. oszloptól kezdve: az adott funkcionális és közgazdasági kategóriák metszetéhez tartozó összeg

```csv
,,1,2,3,...
,,Közg. 1,Közg. 2,Közg. 3,...
1,Funkc. 1,0,0,0,...
2,Funkc. 2,0,0,0,...
3,Funkc. 3,0,0,0,...
...
```



#### economies.csv

Ez a fájl tartalmazza a közgazdasági bontás kategóriáit.

Formátuma CSV:

```csv
id,value,parent_id
1,Kategória 1,NA
101,Kategória 101,1
2,Kategória 2,NA
...
```

Az `id` az adott kategória/alkategória azonosítója, míg a `parent_id` a közvetlen szülő kategória azonosítója (ezutóbbi biztosítja a fa struktúra felépíthetőségét). A `value` pedig a kategória nevét írja le.

Ha egy kategóriánál a `parent_id` olyan értéket tartalmaz, amely nem szerepel ebben a fájlban azonosítóként, az a kategória a legfelső szinten fog megjelenni.



#### economies_milestones.csv

Ez a fájl tartalmazza a közgazdasági bontás főkategóriáihoz rendelt mérföldköveket, melyek egy képből, egy címből és egy néhány mondatos leírásból állnak. Emellett az "annyi, mint" dobozka szövegét is ebből a fájlból olvassa a program, az utolsó oszlopból.

A fájl formátuma CSV, az oszlopai pedig: főkategória azonosító, kép útvonal, cím, leírás, szöveg a dobozba. A teljes költségvetéshez rendelendő mérföldkövet úgy lehet megadni, hogy az első oszlopba felkiáltójelet (`!`) írunk:

```csv
id,picture,title,description,text 1
!,/assets/img/milestone/ph.png,Teljes költségvetés mérföldköve,Lorem ipsum dolor...,x db valami
01,/assets/img/milestone/01.png,01-es kategória mérföldköve,Lorem ipsum dolor...,x db valami
02,/assets/img/milestone/02.png,02-es kategória mérföldköve,Lorem ipsum dolor...,x db valami
```

Ajánlott a fájlnevekben az ékezetes betűket mellőzni, nem minden esetben működnek.



#### functions.csv

Ez a fájl tartalmazza a funkcionális bontás kategóriáit.

Formátuma és tulajdonságai megegyeznek az `economies.csv` fájl esetében leírtakkal.



#### functions_milestones.csv

Ez a fájl tartalmazza a funkcionális bontás mérföldköveit.

Formátuma és tulajdonságai megegyeznek az `economies_milestones`.csv fájl esetében leírtakkal.



### Beállítások

Az `js/app.js` fájl elején található egy konfigurációs szakasz. Itt szükség esetén át lehet írni az alábbi beállításokat:

```js
var
	YEAR = document.body.dataset.year,
	BUDG_FILE = '/' + YEAR + '/budget.csv',
	ECON_FILE = '/' + YEAR + '/economies.csv',
	FUNC_FILE = '/' + YEAR + '/functions.csv',
	ECON_MILESTONES_FILE = '/' + YEAR + '/economies_milestones.csv',
	FUNC_MILESTONES_FILE = '/' + YEAR + '/functions_milestones.csv',
	colors = [
		'#f7981d' /* 01 Általános közszolgáltatások */,
		'#5c628f' /* 02 Védelem */,
		'#9d4a23' /* 03 Közrend és közbiztonság */,
		'#254478' /* 04 Gazdasági ügyek */,
		'#d32027' /* 05 Környezetvédelem */,
		'#5c9ad2' /* 06 Lakásépítés és kommunális létesítménye */,
		'#fcbf10' /* 07 Egészségügy */,
		'#70ac45' /* 08 Szabadidő, sport, kultúra, vallás */,
		'#4971b6' /* 09 Oktatás */,
		'#bb208a' /* 10 Szociális védelem */,
		'#ef538c' /* 9000 Technikai funkciókódok */,
	]
;
```

Az első néhány változó az adatfájlok relatív útvonalát definiálja, míg a `colors` tömb tartalmazza a főkategóriákhoz rendelendő színeket. A főkategóriákat a program rendezi a kódjuk szerint, majd az így kialakult sorrendben az 1. főkategória kapja az 1. színt, a 2. főkategória a 2. színt, és így tovább. Ha több a kategória, mint a megadott szín, akkor a lépdelés a tömbben elölről kezdődik.

 Módosítás után build-elni kell a Jekyll projektet.



## Weboldal személyre szabása

Az adatok módosítása könnyen megoldható a fentebb említett fájlok cseréjével/szerkesztésével, de adott esetben szükség lehet a weboldal keret szövegeinek átírására is. Az alábbiakban kiemelem a legtipikusabb eseteket. A `_layouts/koltsegvetes.html` fájlt kell szerkeszteni, majd build-elni a Jekyll projektet.



### Ablak címsora (város/település)

```html
<head>
	...
	<title>Költségvetés {{ page.year }} | Mintaváros</title>
	<meta property="og:title" content="Költségvetés {{ page.year }}">
	<meta property="og:site_name" content="Mintaváros Önkormányzata">
	...
```



### Önkormányzathoz kapcsolódó képek

Ha másik önkormányzathoz szeretnéd felhasználni a fájlokat, az alábbi fájlokat érdemes lehet cserélni:

* `assets/img/logo.png`: 181x79 px méretű, áttetszű hátterű logó, mely a fehér fejléc jobb oldalán jelenik meg
* `assets/img/og-image.png`: 500x500 px méretű, fehér hátterű logó, mely Facebook poszt előnézeti képekén jelenik meg
* `assets/img/face.png`: legalább 250x250 px méretű, négyzet alakú arckép, a köszöntő szöveg mellett jelenik meg
* `assets/img/signo.png`: a polgármester aláírása, a köszöntő szöveg alján jelenik meg



### Meta leírás

Ez a szöveg jelenik meg a Google találati dobozban és a Facebook posztban is.

```html
<head>
	...
	<meta property="og:description" name="description" content="Mintaváros költségvetése könnyen befogadható és értelmezhető módon, ahol néhány kattintással mindenki láthatja, miből, mennyit és mire költünk.">
	...
```



### Fejléc (évszám)

```html
<main ...>
	<header ...>
		...
		<h1 class="stretch">Költségvetés {{ page.year }}</h1>
		...
```



### Köszöntő szövege

```html
<div id="welcome" ...>
	<div class="modal">
		...
		<h1>TISZTELT MINTAVÁROSI POLGÁROK!</h1>
		<div class="flex row">
			<div>
				<p>Lorem ipsum dolor...</p>
				<p>Lorem ipsum dolor...</p>
			...
```



### Nézet váltó gomb

```html
<div class="mode-switcher" id="mode-switcher-left">
	<div ...>Váltás közgazdasági nézetre</div>
	<div ...>Váltás funkcionális nézetre</div>
	<div class="info">
		<h4>Mi ez?</h4>
		<p>Lorem ipsum dolor...</p>
	</div>
</div>
```