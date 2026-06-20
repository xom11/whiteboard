# Hình học phẳng — Huy Cao's Blog (julielltv.wordpress.com)

> Nguồn: Huy Cao's Blog — julielltv.wordpress.com · Chuyên mục: Hình học phẳng (plane geometry) · Thu thập: 2026-06-06 · 96 bài (đề Olympic/đội tuyển).
>
> LaTeX viết inline trong `$...$`. Dùng làm dữ liệu cho pipeline sinh hình (intent → DSL).

## 1. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ nhọn, $M$ là trung điểm của $AB$ . $AD,BE$ là hai đường cao của tam giác. $CM$ theo thứ tự cắt $(CDE),(ABC)$ tại điểm thứ hai là $P,Q$ . Chứng minh $MP=MQ$ .

<details><summary>Lời giải</summary>

Gọi $H$ là trực tâm tam giác $ABC$ và $F$ là chân vuông góc từ $C$ xuống $AB$ . Ta có $\angle HPM=\angle HFM=90^0$ nên $HPMF$ nội tiếp. Tứ giác $EFMD$ nội tiếp đường tròn Euler của tam giác $ABC$ và tứ giác $EHPD$ nội tiếp đường tròn đường kính $CH$ . Như vậy ta có $HD,ED,FM$ đồng quy tại tâm đẳng phương $J$ của ba đường tròn $(HPMF),(EFMD),(EHPD)$ . Từ đó mà : $JA.JB=JE.JD=JH.JP$ (Chú ý tứ giác $EDBA,EHPD$ nội tiếp) Suy ra tứ giác $HPBA$ nội tiếp. Lúc này : $\angle PAB=\angle PHB=\angle ACQ=\angle ABQ$ Kéo theo $AP$ song song $QB$ . Và : $\angle PBA=\angle DHP=\angle DCP=\angle BAQ$ Suy ra $PB$ song song $QA$ . Như vậy $PBQA$ là hình bình hành, dễ thấy được $M$ là trung điểm của $PQ$ hay $MP=MQ$ .

</details>

Nguồn: https://julielltv.wordpress.com/2015/08/10/geometry-94/

---

## 2. (không rõ nguồn thi)

**Đề:** Cho tứ giác $ABCD$ nội tiếp $(O)$ . $P$ di chuyển trên cung $CD$ không chứa $A,B$ . $PA$ cắt $DB,DC$ tại $E,F$ . $PB$ cắt $CA,CD$ tại $G,H$ . $GF$ giao $EH$ tại $Q$ . Chứng minh $PQ$ luôn đi qua một điểm cố định.

<details><summary>Lời giải</summary>

Gọi $U,V$ theo thứ tự là giao của tiếp tuyến tại $B$ với $AC$ và tiếp tuyến tại $A$ với $BD$ . Gọi $T$ là giao của $BU$ và $AV$ . Áp dụng định lí Pascal cho bộ sáu điểm $(D,B,B,P,A,C)$ thì ta được $U,E,H$ thẳng hàng. Tương tự thì $V,G,F$ thẳng hàng. Tiếp tục gọi $W$ là giao của $AB$ và $CD$ . Áp dụng định lí Pascal cho bộ sáu điểm $(A,A,C,D,B,B)$ thì ta có $U,V,W$ thẳng hàng. Xét hai tam giác $BUH$ và $AVF$ có $AB,UV,HF$ đồng quy. Và : $P=AF\cap BH,Q=VF\cap UH,T=AV\cap BU$ Theo định lí Desargues ta có $P,Q,T$ thẳng hàng. Dễ thấy $T$ cố định nên $PQ$ luôn đi qua một điểm cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2015/08/03/geometry-93/

---

## 3. (không rõ nguồn thi)

**Đề:** Cho tứ giác $ABCD$ nội tiếp trong đường tròn. Một điểm $P$ trong tứ giác thỏa mãn $\widehat{PDC}+\widehat{PCB}=\widehat{PBC}+\widehat{PAB}=90^{\circ}$ Gọi $S$ là giao điểm của $AB,CD$ . Chứng minh $SP$ vuông góc $BC$

<details><summary>Lời giải</summary>

Gọi $H$ là chân vuông góc của $P$ xuống $BC$ . Ta có : $\angle PAB+\angle PBC=90^0$ $\angle BPH+\angle PBC=90^0$ Suy ra $\angle PAB=\angle BPH$ , điều này chứng tỏ rằng $PH$ là tiếp tuyến tại $P$ của $(PAB)$ . Tương tự $PH$ là tiếp tuyến tại $P$ của $(PCD)$ . Như vậy $(PAB),(PCD)$ tiếp xúc ngoài nhau và có trục đẳng phương là $PH$ . Hơn nữa do $ABCD$ nội tiếp nên $SA.SB=SC.SD$ , suy ra $S$ thuộc trục đẳng phương của $(PAB),(PCD)$ , tức $S$ thuộc $PH$ . Ta có điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2015/05/20/geometry-92/

---

## 4. (Iran Second Round 2015)

**Đề:** (Iran Second Round 2015) Cho tam giác $ABC$ và $D,E$ lần lượt là các điểm trên cạnh $AB,AC$ sao cho tứ giác $BDEC$ nội tiếp. Gọi $P$ là giao của $BE,CD$ . Gọi $H$ là điểm trên $AC$ thoả $\angle AHP=90^0$ và $M,N$ lần lượt là trung điểm của $AP,BC$ . Chứng minh rằng hai tam giác $MHN,ADC$ đồng dạng.

<details><summary>Lời giải</summary>

Ta sẽ chứng minh đường tròn $(MHN)$ chính là đường tròn Euler của tam giác $APC$ . Thật vậy, gọi $K,L$ là trung điểm của $AC,PC$ thế thì chú ý $KL\parallel AP,NL\parallel BP$ . Ta có : $\angle KNL=\angle BNL-\angle BNK=(180^0-\angle EBC)-(180^0-\angle ABC)=\angle ABC-\angle EBC=\angle ACD=\angle MLP=\angle KML$ Suy ra tứ giác $MNLK$ nội tiếp hay $N$ thuộc đường tròn Euler của tam giác $APC$ . Từ đó có ngay $M,N,H,K,L$ cùng thuộc một đường tròn. Từ đó có : $\angle HMN=\angle CKN=\angle CAD,\angle HNM=\angle HKM=\angle ACD$ Điều này chứng tỏ hai tam giác $AHM,ADC$ đồng dạng.

</details>

Nguồn: https://julielltv.wordpress.com/2015/05/08/geometry-iran-second-round-2015-2/

---

## 5. (Iran Second Round 2015)

**Đề:** (Iran Second Round 2015) In the quadrilateral $ABCD$ , $AC$ is the bisector of $\angle A$ and $\angle ADC=\angle ACB$ . $X,Y$ are feet of perpendicular from $A$ to $BC,CD$ respectively. Prove that the orthocenter of triangle $AXY$ is on $BD$ .

<details><summary>Lời giải</summary>

Easy to see that the circle $(AXY)$ through $C$ . Let $E,F$ be the intersection of $(AXY)$ and $AB,AC$ respectively. Let $H$ be the intersection of $EY$ and $FX$ . We apply Pascal theorem for six points $H,A,G,X,C,Y$ , we get that $B,H,D$ are conlinear. On the other hand, $\angle AFX=\angle ACX=\angle ADC$ . So we have $XF$ is parrallel to $C$ , implies $XF \perp AY$ . Similary, $YE \perp AX$ . Consequenlty, $H$ be the orthocenter of triangle $AXY$ . We are done.

</details>

Nguồn: https://julielltv.wordpress.com/2015/05/08/geometry-iran-second-round-2015/

---

## 6. (Đề thi Olympic Duyên hải và Đồng bằng Bắc Bộ lớp 11 năm 2015)

**Đề:** (Đề thi Olympic Duyên hải và Đồng bằng Bắc Bộ lớp 11 năm 2015) Cho hai đường tròn $(O_1)$ và $(O_2)$ cắt nhau tại hai điểm $A,B$ . $AX,XY$ theo thứ tự là hai đường kính của $(O_1),(O_2)$ . $I$ là một điểm thuộc phân giác góc $XAY$ sao cho $I$ không thuộc hai đường tròn và $OI$ không vuông góc $XY$ . Đường thẳng qua $A$ vuông góc $AI$ cắt $(O_1),(O_2)$ tại $E,F$ lần lượt. $IX$ cắt $(O_1)$ tại $K$ , $IY$ cắt $(O_2)$ tại $L$ . 1) Gọi $C$ là giao của $EF$ với $IX$ và $O$ là trung điểm của $XY$ . Chứng minh $OE$ tiếp xúc với $(CEK)$ . 2) Chứng minh $EK,FL,OI$ đồng quy.

<details><summary>Lời giải</summary>

1) Dễ thấy rằng $EO_1$ song song với $AY$ nên $EO_1$ đi qua trung điểm $O$ của $XY$ . Tương tự $FO_2$ cũng đi qua $O$ . Ta có : $\angle OEK=\angle O_1EK=\angle O_1EA-\angle AEK=\angle EAO_1-\angle AXK=\angle ACX=\angle ECK$ Điều này chứng tỏ $OE$ là tiếp tuyến của $(CEK)$ . 2) Gọi $D$ là giao của $YL$ với $EF$ , tương tự thì $OF$ là tiếp tuyến của $(DFL)$ . Mà dễ chứng minh $OE=OF$ nên $O$ nằm trên trục đẳng phương của $(CEK),(DFL)$ . Tiếp theo ta sẽ chứng minh hai tứ giác $DLKC$ và $ELKF$ nội tiếp. Chứng minh $DLKC$ nội tiếp : Gọi $U$ là giao của $AI$ và $(O_1)$ thì có $\angle O_1UA=\angle O_1AU=\angle UAY$ , suy ra $O_1U$ song song $AY$ , dẫn đến $O_1U$ đi qua $O$ . Vì $OE$ tiếp xúc $(CEK)$ nên $\angle KCE=\angle KEU=\angle KAU=\angle KAI=\angle KLI$ (chú ý là tứ giác $ALIK$ nội tiếp do có hai góc đối là góc vuông). Từ đó mà có $DLKC$ nội tiếp. Chứng minh $ELKF$ nội tiếp : Ta có : $\angle FLK=\angle FLI-\angle KLI=\angle FLY-\angle KEU$ $\angle FEK=\angle FEO-\angle KEU$ Mặt khác dễ thấy rằng $\angle FEO=\angle FLI$ nên kéo theo $\angle FLK=\angle FEK$ . Điều này chứng tỏ $ELKF$ nội tiếp. Tiếp theo ta gọi $J$ là giao của $EK,FL$ thì do $ELKF$ nội tiếp nên : $JE.JK=JL.JF\Rightarrow P_{J/(CEK)}=P_{J/DFL}$ Vậy $J$ nằm trên trục đẳng phương của $(CEK),(DFL)$ Tương tự do $DLKC$ nội tiếp nên suy ra được $I$ nằm trên trục đẳng phương của $(CEK),(DFL)$ . Ta có ba điểm $O,I,J$ cùng nằm trên trục đẳng phương của $(CEK),(DFL)$ nên chúng thẳng hàng. Hay nói cách khác $EK,FL,OI$ đồng quy, đây là điều cần chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2015/05/01/geometry-olympic-duyen-hai-va-dong-bang-bac-bo2015/

---

## 7. (APMO 2015)

**Đề:** (APMO 2015) Cho tam giác $ABC$ nội tiếp $(O)$ , gọi $D$ là một điểm trên cạnh $BC$ . Một đường thẳng qua $D$ cắt cạnh $AB$ tại $X$ và cắt tia $AC$ tại $Y$ . Đường tròn $(BXD)$ cắt $(O)$ tại $Z$ . Đường thẳng $ZD,ZY$ theo thứ tự cắt $(O)$ tại $V,W$ . Chứng minh $AB=VW$ .

<details><summary>Lời giải</summary>

Dễ dàng nhận thấy điểm $Z$ chính là điểm Miquel của tứ giác toàn phần $ABCXDY$ . Cho nên tứ giác $CDZY$ nội tiếp. Suy ra : $\angle ZYD=\angle ZCD$ Mà lại có $\angle ZCD=\angle ZCB=\angle ZWB$ do tứ giác $ZWCB$ nội tiếp. Như vậy thì $\angle ZWB=\angle ZYD$ . Điều này cho ta $WB,YD$ song song nhau. Tương tự thì $AV,YD$ cũng song song nhau. Kéo theo $AV,WB$ song song. Dễ suy ra đuợc $AB=VW$ .

</details>

Nguồn: https://julielltv.wordpress.com/2015/04/10/geometry-apmo-2015/

---

## 8. (không rõ nguồn thi)

**Đề:** Cho tứ giác $ABCD$ nội tiếp $(O)$ , gọi $E,F$ theo thứ tự là giao của $AB,CD$ và $AD,BC$ . Gọi $M,N$ theo thứ tự là trung điểm của $AC,BD$ . Gọi $H,K$ theo thứ tự là trực tâm các tam giác $MEF,NEF$ . Chứng minh tứ giác $HNKM$ là hình bình hành.

<details><summary>Lời giải</summary>

Bổ đề : Cho tam giác $ABC$ có $M$ là trung điểm của $BC$ và $H$ là trực tâm. Gọi $K$ là giao của $AM$ với cung $BC$ chứa $H$ của $(HBC)$ . Chứng minh $HK$ vuông góc $AM$ . Chứng minh bổ đề : Gọi $AD,BE,CF$ là ba đường cao của tam giác $ABC$ . Gọi $G$ là giao $EF,BC$ và $GH$ giao $AM$ tại $K'$ . Ta chứng minh $K$ trùng $K'$ . Thật vậy, theo định lí Brocard thì $M$ là trực tâm tam giác $GHA$ nên $GK'$ vuông góc $AM$ . Từ đó $K'$ thuộc $(AEHF)$ . Từ đó $GH.GK'=GF.GE=GB.GC$ . Suy ra $K'$ thuộc $(HBC)$ . Từ đó $K$ trùng $K'$ . Hơn nữa ta cũng đã chứng minh $GK' \perp AM$ . Bổ đề được chứng minh. Trở lại với bài toán : Gọi $X,Y$ theo thứ tự là giao của $AC,BD$ với $EF$ và $P$ là trung điểm của $EF$ . Theo định lí về đường thẳng Gauss-Newtion thì $P,M,N$ thẳng hàng. Gọi $G$ là giao của $AC,BD$ . Dễ thấy $(XG,CA)=-1$ (hàng điều hoà tứ giác toàn phần) và do $M$ là trung điểm $CA$ nên theo hệ thức Maclaurin thì $GM.GX=GC.GA$ . Hoàn toàn tương tự ta có $GN.GY=GB.GD$ . Lại dễ thấy $GA.GC=GB.GD$ nên có $GN.GY=GM.GX$ . Từ đây suy ra tứ giác $XYMN$ nội tiếp. Ta suy ra : $PX.PY=PM.PN\;\;\;\;(1)$ Lại cũng có $(EF,XY)=-1$ và $P$ là trung điểm $EF$ nên theo hệ thức Newton thì $PX.PY=PE^2=PF^2 \;\;(2)$ Từ $(1)(2)$ ta suy ra : $\Delta PFN\sim \Delta PMF,\Delta PEN\sim \Delta PME$ Từ đây thì : $\angle PMF=\angle PFN,\angle PME=\angle PEN$ Kéo theo : $\angle EMF=\angle PME+\angle PMF=\angle PEN+\angle PFM=180^0-\angle ENF\Rightarrow \angle ENF=\angle EHF$ Điều này cho ta $FHNE$ nội tiếp. Khi đó áp dụng bổ đề ta có $HN$ vuông góc $MP$ . Hoàn toàn tương tự thì $FMKE$ nội tiếp và $KM$ vuông góc $MP$ . Suy ra $HN$ song song $KM$ . Lại có $HM$ song song $NK$ do cùng vuông góc $EF$ . Từ đó có $HNKM$ là hình bình hành.

</details>

Nguồn: https://julielltv.wordpress.com/2015/01/05/geometry-90/

---

## 9. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ với $AB < AC$ có ba đường cao $AD,BE,CF$ tại $H$ . Biết $EF$ cắt $AH,BC$ tại $L,G$ . Trung trực $LD$ cắt $GH$ tại $P$ . Gọi $M,N,J$ theo thứ tự là trung điểm của $BC,EF,AH$ và $K$ là hình chiếu của $H$ lên $AG$ . a) Chứng minh $AM$ vuông góc với $GH$ . b) Chứng minh $IJ$ là tiếp tuyến chung của $(GKN)$ và $(DPL)$

Nguồn: https://julielltv.wordpress.com/2014/12/26/geometry-mathscope/

---

## 10. (China Team Selection Test 2008)

**Đề:** (China Team Selection Test 2008) Cho tam giác $ABC$ nhọn có $I$ là tâm nội tiếp. $M,N$ là hai trung điểm cung nhỏ $AC,AB$ của đường tròn $(O)$ ngoại tiếp tam giác $ABC$ và $D$ là trung điểm $MN$ . Lấy $G$ là điểm tuỳ ý trên cung nhỏ $BC$ của $(O)$ . Gọi $I_1,I_2$ theo thứ tự là tâm nội tiếp các tam giác $ABG,ACG$ . $P$ là giao điểm thứ hai của $(O)$ và $(GI_1I_2)$ . Chứng minh $P,I,D$ thẳng hàng.

<details><summary>Lời giải</summary>

Có thể thấy đây chính là một tính chất quen thuộc của đường tròn Mixtilinear và dễ nhìn ra được $P$ chính là điểm tiếp xúc của $(O)$ và đường tròn Mixtilinear góc $A$ của tam giác $ABC$ . Ta sẽ chứng minh điều này. Dễ dàng nhận ra được : $NA=NB=NI=NI_1,MA=MC=MI=MI_2$ Cũng dễ dàng nhìn ra đuơc hai tam giác $PI_1N,PI_2M$ đồng dạng. Kéo theo : $\dfrac{PN}{PM}=\dfrac{NI_1}{MI_2}=\dfrac{NA}{MA}$ Đẳng thức này chứng tỏ $NAMP$ là tứ giác điều hoà. Mặt khác nếu gọi $P'$ là tiếp điểm của $(O)$ và đường tròn Mixtilinear góc $A$ của tam giác $ABC$ thì theo tính chất 6 này ta được $NAMP'$ là tứ giác điều hoà. Điều này chứng tỏ $P,P'$ trùng nhau. Từ đó dễ dàng nhận thấy $PI$ đi qua trung điểm $R$ của cung $BAC$ . Bằng cộng góc đưa về các góc trong tam giác $ABC$ , ta có $RM$ song song $NI$ . Tương tự $RN$ song song $MI$ . Suy ra $RMIN$ là hình bình hành. Mà $D$ là trung điểm của $MN$ nên $D$ cũng là trung điểm của $RI$ . Kéo theo $I,D,R$ thẳng hàng. Vậy ta có $P,I,D$ thẳng hàng.

</details>

Nguồn: https://julielltv.wordpress.com/2014/12/18/geometry-china-tst-2008-mixtilinear-circle/

---

## 11. (Đề thi thử VMO 2015 Viện Toán Học)

**Đề:** (Đề thi thử VMO 2015 Viện Toán Học) Cho tam giác $ABC$ nhọn nội tiếp đường tròn $(O)$ . Gọi $I$ là trung điểm của $BC$ và $H$ là trực tâm tam giác $ABC$ . Cho $BH,CH$ cắt $CA,AB$ tương ứng tại $E,F$ . Tia $IH$ cắt $(O)$ tại $T$ . Trên đường thẳng $EF$ lấy điểm $D$ sao cho $HD$ song song $BC$ . a) Chứng minh $DT$ tiếp xúc với $(HEF)$ . b) Gọi $M,N$ là giao theo thứ tự của $EF$ với $(IBT),(ICT)$ thoả $M$ khác phía $E$ đối với $F$ và $N$ khác phía $F$ đối với $E$ . Gọi $P$ là giao của $AH$ với $(O)$ . Chứng minh $BN,CM,TP$ đồng quy.

<details><summary>Lời giải</summary>

a) Theo định lí Brocard thì $TI$ vuông góc $JA$ , điều này cho ta $T$ thuộc $(AFHE)$ . Gọi $J$ là giao $BC$ với $EF$ . Vì $JE.JF=JB.JC$ hay $J$ có cùng phương tích với $(HEF)$ và $(O)$ . Suy ra $J$ thuộc trục đẳng phương của chúng, tức $J$ thuộc $TA$ . Ta thấy : $\angle FDH=\angle FCB=\angle HEF$ Điều này chứng tỏ là $DH$ là tiếp tuyến của $(HEF)$ . Mặt khác, $DH$ song song $BC$ và $I$ là trung điểm của $BC$ nên suy ra $H(BC,DI)=-1$ . Hay là $H(EF,HT)=-1$ . Suy ra tứ giác $TFHE$ điều hoà, lại có $EF$ cắt tiếp tuyến tại $H$ của $(HEF)$ tại $D$ nên $DT$ là tiếp tuyến của $(HEF)$ . b) Ta có $T(BE,JH)=-1$ và $TI$ vuông góc $JA$ nên theo định lí chùm điều hoà ta có $TI$ là phân giác góc $BTE$ hay $\angle BTE=2 \angle ITE =2 \angle HTE =2 \angle HAC$ . Hơn nữa $\angle HAC=\angle EBI$ và $\angle EIC=2\angle EBI$ vì $I$ là trung điểm cạnh huyền $BC$ của tam giác vuông $BEC$ . Kéo theo $\angle BTE=\angle EIC$ . Điều này cho ta $TBIE$ nội tiếp hay $E \in (TBI)$ . Từ đó : $\angle MBT=\angle \angle TEM=\angle TAB=\angle TCB$ Suy ra $MB$ là tiếp tuyến tại $B$ của $(O)$ . Tương tự $NC$ là tiếp tuyến tại $C$ của $(O)$ . Hơn nữa có $A(TP,BC)=A(JH,BC)=-1$ nên tứ giác $TBPC$ điều hoà. Suy ra $TP$ và hai tiếp tuyến tại $B,C$ của $(O)$ đồng quy. Tức là $TP,BM,NC$ đồng quy. Hoàn tất bài toán.

</details>

Nguồn: https://julielltv.wordpress.com/2014/12/11/geometry-89/

---

## 12. (Đề thi thử VMO 2015 Viện Toán Học)

**Đề:** (Đề thi thử VMO 2015 Viện Toán Học) Cho tam giác nhọn $ABC$ có $D,E,F$ là trung điểm $BC,CA,AB$ . Gọi $(I)$ là đường tròn đường kính $AD$ . $(I)$ cắt $AB,AC$ tại $M,N$ . $MN,EF$ cắt nhau tại $P$ . a) Chứng minh $(DIP)$ đi qua trung điểm $Q$ của $MN$ . b) Gọi $G$ là một điểm cố định trên đoạn $EF$ . Một đường thẳng thay đổi qua $G$ cắt $(I)$ tại $H,K$ . Cho $KF,HE$ cắt $(I)$ tại $R,S$ . Chứng minh trung điểm $T$ của $RS$ thuộc một đường tròn cố định.

<details><summary>Lời giải</summary>

a) Dễ thấy $\angle IQP=90^0$ nên chỉ cần chỉ ra $\angle IDP=90^0$ hay $DP$ là tiếp tuyến của $(I)$ tại $D$ thì bài toán xong. Gọi $L$ là giao của $(I)$ với trung trực của $BC$ và $J$ là trung điểm của $LD$ . Ta dễ dàng thấy : $\angle MJN=\angle MFD+\angle NED=2\angle BAC=2(\angle MAD+\angle DAN)=\angle MID+\angle NID=\angle MIN$ Suy ra rằng $IJNM$ nội tiếp. Khi đó gọi $d'$ là tiếp tuyến tại $D$ của $(I)$ thì $d',IJ,MN$ đồng quy tại $P$ vì tương ứng là trục đẳng phương của hai trong ba đường tròn $(I),(IJNM)$ và đường tròn đường kính $ID$ . Suy ra $DP$ trùng $d'$ tức $DP$ là tiếp tuyến của $(I)$ b) Ta phát biểu và chứng minh một bổ đề là mở rộng của định lí con bướm (Butterfly Theorem) : Bổ đề (Mở rộng định lí con bướm) Cho dây cung $PQ$ của $(O)$ và $M$ là trung điểm của $PQ$ . $Z,W$ là các điểm trên $AB$ sao cho $MZ=MW$ . Gọi $AB,CD$ theo thứ tự qua $W,Z$ là các dây cung của $(O)$ . $PQ$ theo thứ tự cắt $AD,BC$ tại $X,Y$ . Khi đó ta có $MX=MY$ . Chứng minh bổ đề : Gọi $S$ là giao của $AD,BC$ . Xét tam giác $SXY$ và hai cát tuyến $CZD,AWB$ . Sử dụng định lí Menelaus : $\dfrac{CS}{CY}.\dfrac{ZY}{ZX}.\dfrac{DX}{DS}=1,\dfrac{AS}{AX}.\frac{WX}{WY}.\dfrac{BY}{BS}=1$ Kéo theo : $\dfrac{CS.ZY.DX.AX.WY.BS}{CY.ZX.DS.AS.WX.BY}=1$ Dễ thấy $CS.BS=AS.DS$ và $DX.AX=PX.QX,CY.BY=PY.QY$ ta được : $\dfrac{PX.QX.WY.ZY}{PY.YQ.ZX.WX}=1$ Đặt $PM=QM=a,MZ=MW=b,MX=x,MY=y$ ta được : $\dfrac{(a-x)(a+x)(y-b)(y+b)}{(a+y)(a-y)(x-b)(x+b)}=1\Leftrightarrow (a^2-x^2)(y^2-b^2)=(a^2-y^2)(x^2-b^2)\Leftrightarrow (a^2-b^2)(x^2-y^2)=0$ Rõ ràng nếu $a=b$ thì bài toán trở thành định lí con bướm. Còn nếu $a \neq b$ thì $x=y$ tức $MX=MY$ . Suy ra điều phải chứng minh. Quay trở lại bài toán : Gọi $V$ là giao của $EF$ với $RS$ . Ta thấy $I$ là trung điểm của đường kính $EF$ , từ đó theo bổ đề trên thì ta được $I$ là trung điểm của $GV$ . Do $G,I$ cố định nên $V$ cũng cố định. Từ đó không khó để thấy $T$ thuộc đường tròn đường kính $IV$ , đây là một đường tròn cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2014/12/11/3913/

---

## 13. (không rõ nguồn thi)

**Đề:** Cho nửa đường tròn tâm $O$ đường kính $AB$ . $M$ là một điểm trên tia đối tia $BA$ . Một cát tuyến qua $M$ cắt nửa đường tròn tại $C,D$ sao cho $MD<MC$ . Gọi $K$ là giao của $(AOC),(BOD)$ . Chứng minh $MK$ vuông góc $OK$ .

<details><summary>Lời giải</summary>

Gọi $X$ là giao điểm của $AC,BD$ và $Y$ là giao điểm của $AD,BC$ . Dễ thấy $X$ chính là tâm đẳng phương của ba đường tròn $(O),(AOC),(BOD)$ nên $X,O,K$ thẳng hàng. Ta sẽ chứng minh $K,Y,M$ thẳng hàng. Ta có : $\angle AKB=\angle AKO+\angle OKB=\angle ACO+\angle ODB=\angle CAO+\angle ODB=\left ( \angle CAD+\angle DAO \right )+\left ( \angle ADB-\angle ADO \right )=\angle CAD+\angle CAY=\angle AYB$ Vậy ta có tứ giác $AKYB$ nội tiếp. Từ đó cũng dễ thấy luôn tứ giác $CKYD$ nội tiếp. Từ đó vì $M$ cùng phương tích với hai đường tròn $(AKYB),(CKYD)$ nên $M$ thuộc trục đẳng phương của hai đường tròn này tức $M$ thuộc $KY$ . Ta được $M,K,Y$ thẳng hàng. Theo định lý Brocard thì $O$ là trực tâm tam giác $XYM$ nên $MY$ vuông góc $OX$ hay $MK$ vuông góc $OK$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/09/04/geometry-87/

---

## 14. (không rõ nguồn thi)

**Đề:** Cho tứ giác $ABCD$ nội tiếp $(O)$ . $E,F,I$ lần lượt là giao điểm của các cặp đường $(AD,BC),(AB,CD),(AC,BD)$ . Gọi $G$ là giao điểm thứ hai của $(O)$ và $(AEF)$ và $H$ là giao điểm thứ hai của $(O)$ và $(CEF)$ . a) (ELMO Shortlist 2014) Chứng minh rằng $GH,AC,BD$ đồng quy. b) Gọi $Q$ là điểm Miquel của tứ giác toàn phần $ABCDEF$ . Chứng minh $OQ,AC,BD$ đồng quy. c) Chứng minh bốn điểm $G,O,G,H$ đồng viên.

<details><summary>Lời giải</summary>

a) Dễ thấy $EF,AG,CH$ đồng quy tại tâm đẳng phương của $(AEF),(CEF),(O)$ . Áp dụng định lý Desargues cho hai tam giác $ABG,CDH$ nên để chứng minh $AC,BD,GH$ đồng quy ta đi chứng minh : $\overline{(AB\cap CD),(BG\cap DH),\left ( AG\cap CH \right )}$ Nhưng dễ thấy $AB\cap CD$ và $AG\cap CH$ đều thuộc đường thẳng $EF$ nên ta phải chứng minh $BG\cap DH$ cũng thuộc $EF$ . Áp dụng định lý Pascal cho sáu điểm $(D,A,G,B,C,H)$ ta được $BG\cap DH$ nằm trên đường thẳng nối $AD\cap BC$ và $AG\cap CH$ . Dễ thấy đó chính là $EF$ , tức là $BG\cap DH$ nằm trên $EF$ . Ta hoàn thành câu a. b) Ta sẽ chứng minh $QI$ là phân giác góc $BQD$ . Tức là đi chứng minh : $\dfrac{ID}{IB}=\dfrac{QD}{QB}$ Dễ thấy hai tam giác $AIB,DIC$ đồng dạng : $\dfrac{AI}{DI}=\dfrac{BI}{CI}=\dfrac{AB}{CD}$ $IA.IC=IB.ID\Rightarrow \dfrac{IB}{ID}=\dfrac{IA}{ID}.\dfrac{IC}{ID}=\dfrac{AB}{CD}.\dfrac{IC}{ID}$ Cũng dễ thấy hai tam giác $QAB,QDC$ đồng dạng : $\dfrac{QA}{QD}=\dfrac{QB}{QC}=\dfrac{AB}{CD}$ $QA.QC=QB.QD\Rightarrow \dfrac{QB}{QD}=\dfrac{QA}{QD}.\dfrac{QC}{QD}=\dfrac{AB}{CD}.\dfrac{QC}{QD}$ Như vậy ta cần chứng minh : $\dfrac{IC}{ID}=\dfrac{QC}{QD}$ Thực như vậy, bởi các tam giác $AID,BIC$ đồng dạng nên $\dfrac{IC}{ID}=\dfrac{BC}{AD}$ và vì các tam giác $QAD,QBC$ đồng dạng nên $\dfrac{QC}{QD}=\dfrac{BC}{AD}$ . Từ đó $\dfrac{IC}{ID}=\dfrac{QC}{QD}$ . Như vậy $QI$ là phân giác góc $BQD$ Gọi $S$ là giao của $BD,EF$ . Dễ thấy $Q(DB,IS)=-1$ mà $QI$ là phân giác góc $BQD$ nên theo định lý về chùm điều hòa ta có $QI$ vuông góc $QS$ hay $QI$ vuông góc $EF$ . Hơn nữa theo định lý Brocard thì $O$ là trực tâm tam giác $EFI$ . Suy ra $OI$ vuông góc $EF$ . Ta được $O,I,Q$ thẳng hàng. Hay nói cách khác $OQ,AC,BD$ đồng quy. c) Để ý rằng : $\angle BQD=2\angle IQD=2\left ( 90^0-\angle FQD \right )=180^0-2\angle BCD=180^0-\angle BOD$ Vậy ta được tứ giác $BODQ$ nội tiếp, kéo theo $IB.ID=IO.IQ$ . Mà theo câu a thì $G,H,I$ thẳng hàng nên $IG.IH=IB.ID$ Kéo theo $IO.IQ=IG.IH$ . Điều này chứng tỏ bốn điểm $G,H,O,Q$ đồng viên.

</details>

Nguồn: https://julielltv.wordpress.com/2014/09/03/geometry-85/

---

## 15. (Trại hè Hùng Vương 2014)

**Đề:** (Trại hè Hùng Vương 2014) Cho tam giác $ABC$ nội tiếp đường tròn tâm $O$ . Đường tròn tâm $I$ tiếp xúc với hai cạnh $AC, BC$ lần lượt tại $E, F$ và tiếp xúc trong với đường tròn $(O)$ tại $P$ . Một đường thẳng song song với $AB$ và tiếp xúc với $(I)$ tại $Q$ nằm trong tam giác $ABC$ a) Gọi $K,L$ lần lượt là giao điểm thứ hai của $PE$ và $PF$ với $(O)$ . Chứng minh $KL$ song song với $EF$ b) Chứng minh $\angle{ACP} = \angle{QCB}$

<details><summary>Lời giải</summary>

a) Kẻ tiếp tuyến tại $P$ chung của hai đường tròn. Khi đó ta có : $\angle KLP=\angle KPx=\angle EPx=\angle EFP$ Vậy $KL$ song song $EF$ . b) Theo định lý Lyness thì $E,J,F$ thẳng hàng với $J$ là tâm nội tiếp tam giác $ABC$ . Gọi $X$ là giao điểm thứ hai của $CP$ và $(I)$ . Trong tam giác $PEF$ có $PI$ là trung tuyến và $PX$ là đối trung nên $PI,PX$ đẳng giác. Suy ra : $\angle XPE=\angle QPF\Rightarrow XE=QF$ Ta được $XQFE$ là một hình thang cân, do $CI$ là trung trực của $EF$ nên $CI$ là trung trực của $XQ$ Kéo theo tam giác $XCQ$ cân và $CI$ đồng thời là phân giác góc $XCQ$ . Mà $CI$ là phân giác góc $ECF$ . Như vậy ta có điều phải chứng minh : $\angle XCE=\angle QCF\Rightarrow \angle PCA=\angle QCB$

</details>

Nguồn: https://julielltv.wordpress.com/2014/09/02/geometry-84/

---

## 16. (Kiểm tra Trường hè Lê Qúy Đôn 2014)

**Đề:** (Kiểm tra Trường hè Lê Qúy Đôn 2014) Cho tứ giác $ABCD$ nội tiếp $(O)$ . Các cặp đường thẳng $(AB,CD),(AD,BC),(AC,BD)$ có giao điểm là $E,F,G$ . Gọi $H$ là giao của hai đường tròn $(ADE),(DCF)$ . Gọi $I$ là giao của phân giác góc $AHB$ và $AB$ . Gọi $J$ là giao của phân giác góc $CHD$ và $CD$ . Chứng minh $I,G,J$ thẳng hàng.

<details><summary>Lời giải</summary>

Chú ý điểm $H$ là điểm Miquel của tứ giác toàn phần $ABCDEF$ . Ta có : $\angle HDA=\angle HCB,\angle HAD=180^0-\angle HAF=180^0-\angle HBF=\angle HBC$ Từ đây ta suy ra hai tam giác $AHD,BHC$ đồng dạng. Như vậy : $\dfrac{HA}{HB}=\dfrac{AC}{BC}=\dfrac{AG}{BG}$ Mà theo tính chất phân giác $\dfrac{HA}{HB}=\dfrac{IA}{IB}$ , kéo theo $\dfrac{AG}{GB}=\dfrac{IA}{IB}$ Tức là $GI$ là phân giác góc $GAB$ . Tương tự $GJ$ là phân giác góc $GCD$ Mà $GAB,GCD$ là hai góc đối đỉnh. Ta được $G,I,J$ thẳng hàng.

</details>

Nguồn: https://julielltv.wordpress.com/2014/09/02/geometry-83/

---

## 17. (Đề thi thử sức – Đồng hành cùng gặp gỡ toán học 2014)

**Đề:** (Đề thi thử sức – Đồng hành cùng gặp gỡ toán học 2014) Gọi $B,C$ là hai điểm nằm trên hai cạnh $AP,PD$ của tam giác nhọn $APD$ . $Q$ là giao của $AC,BD$ . $M,N$ là trung điểm của $AC,BD$ . Gọi $X$ là giao điểm thứ hai của hai đường tròn ngoại tiếp tam giác $ABQ,CDQ$ và $Y$ là giao điểm thứ hai của hai đường tròn $BCQ,ADQ$ . a) Chứng minh năm điểm $X,Y,M,N,Q$ đồng viên. b) Gọi $H_1,H_2$ lần lượt là trực tâm các tam giác $APD,BPC$ . Chứng minh nếu $H_1H_2$ đi qua $X$ thì $H_1H_2$ cũng đi qua $Y$ .

<details><summary>Lời giải</summary>

a) Dễ thấy hai tam giác $ACX,BDX$ đồng dạng. Suy ra : $\dfrac{AX}{AC}=\dfrac{BX}{BD}\Rightarrow \dfrac{AX}{AM}=\dfrac{BX}{BN}\;\;(AC=2AM,BD=2BN)$ Từ đó lại suy ra hai tam giác $AMX,BNX$ đồng dạng. Suy ra : $\angle AMX=\angle BNX\Rightarrow \angle XMC=\angle XMD$ Như vậy bốn điểm $X,M,N,Q$ đồng viên. Tương tự hai tam giác $BYN,CYM$ đồng dạng. Cũng suy ra được $Y,M,N,Q$ đồng viên. Như vậy năm điểm $X,Y,M,N,Q$ đồng viên. b) Dễ thấy $H_1H_2$ chính là trục đẳng phương của đường tròn đường kính $AC,BD$ . Vì $H_1H_2$ đi qua $X$ hay $X$ thuộc trục đẳng phương của hai đường tròn nói trên. Kéo theo : $P_{X/(AC)}=P_{X/(BD)}\Rightarrow XM^2-\dfrac{AC^2}{4}=XN^2-\dfrac{BD^2}{4}\Rightarrow XM^2-XN^2=\dfrac{AC^2-BD^2}{4}$ Do hai tam giác $AXM,BXN$ đồng dạng nên : $\dfrac{XM}{XN}=\dfrac{AM}{BN}=\dfrac{AC}{BD}\Rightarrow XM=\dfrac{AC}{BD}.XN$ Do vậy : $XN^2\left ( \dfrac{AC^2}{BD^2}-1 \right )=\dfrac{AC^2-BD^2}{4}\Rightarrow \left ( AC^2-BD^2 \right )\left ( XN^2-\dfrac{BD^2}{4} \right )=0$ Nếu $XN^2=BD^2/4\Rightarrow XN=BD/2$ thì do $N$ là trung điểm của $BD$ nên tam giác $BNX$ vuông tại $X$ . Tức là : $\angle BXD=90^0\Rightarrow \angle BXQ+\angle QXD=90^0\Rightarrow \angle PAC+ \angle ACP=90^0\Rightarrow \angle APD=90^0$ Nhưng điều này mâu thuẫn vì tam giác $APD$ nhọn. Như vậy phải có $AC=BD$ . Lại có $\dfrac{YM}{YN}=\dfrac{AC}{BD}=1$ nên $YM=YN$ . Kéo theo : $P_{Y/(AC)}=YM^2-AC^2/4=YN^2-BD^2/4=P_{Y/(BD)}$ Suy ra $Y$ thuộc trục đẳng phương của $(AC),(BD)$ . Hay $H_1H_2$ đi qua $Y$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/09/02/geometry-82/

---

## 18. (Đề thi Olympic toán học Nghệ – Tĩnh 2014)

**Đề:** (Đề thi Olympic toán học Nghệ – Tĩnh 2014) Tam giác $ABC$ có $B,C$ cố định và $A$ di chuyển trên cung lớn $BC$ của đường tròn $(O)$ ngoại tiếp tam giác. Gọi $I$ là tâm nội tiếp tam giác. Đường tròn $(M_a)$ tiếp xúc trong với $(O)$ tại $K$ và tiếp xúc $AB,AC$ ở $E,F$ . Các đường thẳng qua $E,F$ lần lượt vuông góc với $CI,BI$ cắt nhau tại $Q$ . a) Chứng minh $E,I,F$ thẳng hàng. b) Chứng minh $IQ$ luôn đi qua một điểm cố định.

<details><summary>Lời giải</summary>

Đây chính là nội dung của định lý Lyness. Ta sẽ chứng minh lại định lý này. Bổ đề : Cho $(O)$ và dây cung $AB$ , $(I)$ tiếp xúc trong với $(O)$ tại $T$ . Dây cung $AB$ của $(O)$ tiếp xúc $(I)$ tại $E$ . Khi đó $TE$ là phân giác góc $ATB$ . Chứng minh bổ đề : Gọi $M,N$ theo thứ tự là giao của $AT,BT$ với $(I)$ . Ta có : $\dfrac{AE^2}{BE^2}=\dfrac{AM.AT}{BN.BT}$ Cũng dễ thấy $MN$ song song $AB$ nên theo Thales $\dfrac{AM}{BN}=\dfrac{AT}{BT}$ nên có ngay $\dfrac{AT}{BT}=\dfrac{AE}{BE}$ . Bổ đề được chứng minh. Quay trở lại bài toán : Gọi $Y,Z$ theo thứ tự là trung điểm cung $AC,AB$ không chứa $B,C$ . Theo bổ đề thì $K,E,Z$ và $K,F,Y$ là bộ điểm thẳng hàng. Áp dụng định lý Pascal cho sáu điểm $(A,Z,B,K,C,Y)$ ta được $E,I,F$ thẳng hàng. Đường tròn $(M_a)$ gọi là đường tròn Mixtilinear ứng với góc $A$ của tam giác $ABC$ . b) Gọi $T,R$ lần lượt là điểm chính giữa các cung lớn, nhỏ $BC$ của $(O)$ . Ta chứng minh lần lượt các kết quả : i) $K,T,I$ thẳng hàng Không khó để thấy rằng $KE$ là phân giác góc $AKB$ và $KF$ là phân giác góc $AKC$ . Xét trong tam giác $KEF$ có $KI$ là trung tuyến và $KA$ là đối trung, như vậy hai đường này đẳng giác. Suy ra : $\angle AKE=\angle IKF$ Hơn nữa $\angle AKE=\dfrac{1}{2}\angle AKB=\dfrac{1}{2}ACB=\angle FCI$ , ta được $\angle IKF = \angle FCI$ . Suy ra tứ giác $FIKC$ nội tiếp. Tương tự tứ giác $EIKB$ nội tiếp. Từ đây suy ra : $\angle BKI=\angle AEI=\angle AFI=\angle CKI$ Như vậy $KI$ là phân giác góc $BKC$ , hay $K,I,T$ thẳng hàng. ii) $Q$ thuộc đường tròn $(M_a)$ . Ta có : $\angle EKF=\angle AKE+\angle AKF=\frac{\angle B+\angle C}{2}=\angle BIC=180^0-\angle EQF$ Suy ra $E,K,F,Q$ đồng viên. Tức $Q$ thuộc $(M_a)$ . iii) $K,Q,R$ thẳng hàng. Ta có : $\angle EKB=\angle IKF\left ( =\angle C/2 \right )\Rightarrow \angle BKI=\angle EKB+\angle EKI=\angle IKF+\angle EKI=\angle EKF$ Do tứ giác $EIKB$ nội tiếp nên $\angle KBI=\angle KEI$ . Từ đó suy ra $\Delta BKI\sim \Delta EKF\Rightarrow \angle BIK=\angle EFK$ Mà $\angle EFK = \angle EQK$ (do $E,F,Q,K$ đồng viên) Như vậy ta được : $\angle BIK=\angle EQK$ Điều này dẫn tới tứ giác $SIQK$ nội tiếp với $S$ là giao của $EQ,BI$ . Do $\angle ISQ=90^0$ nên $\angle IKQ=90^0$ . Tức là $KQ$ vuông góc $KI$ mà $KR$ vuông góc $KI$ nên $K,Q,R$ thẳng hàng. iv) Chứng minh $M_aQ$ vuông góc $BC$ . Gọi $U,V$ là giao của $BC$ với $(M_a)$ sao cho $U$ nằm giữa $B,V$ . Ta có : $BE^2=BU.BV,CF^2=CV.CU$ Suy ra : $\dfrac{BU.BV}{CV.CU}=\dfrac{BE^2}{CF^2}=\dfrac{BK^2}{CK^2}$ Theo định lý Steiner về tiêu chuẩn đẳng giác, ta được $BU,BV$ đẳng giác trong $\angle BKC$ . Mà $KI$ là phân giác $\angle BKC$ nên cũng là phân giác $\angle UKV$ . Suy ra $KI$ đi qua trung điểm cung $UV$ không chứa $K$ của $(M_a)$ . Mà $KI$ vuông góc $KQ$ nên $Q$ chính là điểm chính giữa cung $UV$ chứa $K$ của $(M_a)$ Điều này chứng tỏ $M_aQ$ vuông góc $BC$ . v) Chứng minh $IQ$ luôn đi qua điểm $X$ đối xứng với $T$ qua $R$ . Gọi $X$ là giao của $IQ$ và $TR$ . Ta chứng minh $X$ đối xứng với $T$ qua $R$ . Theo iv) ta có $M_aQ$ vuông góc $BC$ , suy ra được $M_aQ$ song song $OR$ . Từ đó theo Thales : $\dfrac{M_aK}{M_aO}=\dfrac{KQ}{QR}$ Áp dụng định lý Menelaus cho tam giác $TKO$ và cát tuyến $IM_aR$ : $\dfrac{IT}{IK}.\dfrac{M_aK}{M_aO}.\dfrac{RO}{RT}=1\Rightarrow \dfrac{IT}{IK}.\dfrac{M_aK}{M_aO}=2$ Áp dụng định lý Menelaus cho tam giác $KTR$ và cát tuyến $IQR$ : $\dfrac{IT}{IK}.\dfrac{KQ}{QR}.\dfrac{XR}{XT}=1\Leftrightarrow \dfrac{IT}{IK}.\dfrac{M_aK}{M_aO}.\dfrac{XR}{XT}=1\Leftrightarrow \dfrac{XR}{XT}=\dfrac{1}{2}\Leftrightarrow XT=2XR$ Như vậy điểm $X$ đối xứng với $T$ qua $R$ . $T,R$ đều cố định suy ra $X$ cố định. Như vậy $IQ$ luôn đi qua một điểm cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2014/08/30/geometry-81/

---

## 19. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ nội tiếp $(O)$ , trực tâm $H$ và $D$ là chân đường cao từ $B$ . $P$ tùy ý trên $(O)$ và $Q,R,S$ tương ứng đối xứng với $P$ qua trung điểm của $AB,AC,BC$ . $AQ$ giao $HR$ tại $F$ . a) Chứng minh các tam giác $BQS,CSR,ARQ$ có chung trực tâm. b) Chứng minh $DF$ vuông góc $HS$ .

<details><summary>Lời giải</summary>

a) Ta có : $(HB,HC)\equiv (AB,AC)\equiv (PB,PC)\equiv (SB,SC)\pmod{\pi}$ Như vậy bốn điểm $H,S,B,C$ đồng viên. Tương tự các bộ bốn điểm sau $(A,H,B,Q),(A,H,C,R)$ cũng đồng viên. Ta có : $\angle QBA=\angle BAP=\angle BCP=\angle SBC\Rightarrow \angle QBS=\angle QBA+\angle ABS=\angle SBC+\angle ABS=\angle ABC\;\;(*)$ $\angle AHQ=\angle QBA=\angle SBC=\angle SHC\Rightarrow QHS=\angle AHQ+\angle AHS=\angle SHC+\angle AHS=\angle AHC\;\;(**)$ Lại dễ thấy : $\angle ABC+\angle AHC=180^0$ nên từ $(*)(**)$ ta suy ra $\angle QBA+\angle AHQ=180^0\;\;(1)$ . Không khó để thấy $QACS$ là hình bình hành, từ đó $AC$ song song $QS$ nhưng $BH$ vuông góc $AC$ nên $BH$ vuông góc $QS$ $(2)$ Từ $(1)(2)$ suy ra $H$ là trực tâm tam giác $QBS$ . Tương tự các tam giác $CSR,ARQ$ cũng nhận $H$ làm trực tâm. b) Ta có $AF$ song song $SC$ mà $SC$ vuông góc $HR$ do $H$ là trực tâm tam giác $CSR$ nên $AF$ vuông góc $HR$ . Từ đó dễ thấy tứ giác $DFHA$ nội tiếp, suy ra $\angle DFR=\angle DAH=\angle FRC$ , kéo theo $DF$ song song $CR$ mà $CR$ vuông góc $HS$ , vậy $DF$ vuông góc $HS$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/27/geometry-79/

---

## 20. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ nhọn có các đường cao $BL,CK$ cắt nhau tại $H$ . Một đường thẳng qua $H$ cắt $AB,AC$ tại $P,Q$ . Chứng minh rằng $HP=HQ\Leftrightarrow MP=MQ$ với $M$ là trung điểm của $BC$ .

<details><summary>Lời giải</summary>

Gọi $U,V$ lần lượt là hình chiếu của $B,C$ lên $PQ$ . Chú ý các tứ giác $BLKC,LPCV,KQBU$ nội tiếp nên ta có : $HQ.HU=HK.HB=HL.HC=HP.HV$ Vậy ta có : $HP=HQ\Leftrightarrow HU=HV\Leftrightarrow MH\perp PQ\Leftrightarrow MP=MQ$

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/27/geometry-78/

---

## 21. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ nội tiếp $(O)$ , đường cao $AH$ . Đường tròn nội tiếp $(I)$ tiếp xúc $BC$ tại $D$ . Đường tròn đường kính $AI$ cắt $(O)$ tại $M$ , $AH$ tại $N$ . Chứng minh $M,N,D$ thẳng hàng.

<details><summary>Lời giải</summary>

Gọi $T$ là trung điểm cung cung $BC$ không chứa $A$ của $(O)$ . Ta lần lượt chứng minh $M,D,T$ và $N,D,T$ thẳng hàng. Ta có : $\angle MFB=180^0-\angle MFA=180^0-\angle MEA=\angle MEC$ $\angle FBM=\angle ECM$ Từ đó có hai tam giác $MFB,MEC$ đồng dạng, suy ra : $\dfrac{BF}{EC}=\dfrac{MB}{MC}\Rightarrow \dfrac{BD}{DC}=\dfrac{MB}{MC}$ Vậy $MD$ là phân giác góc nội tiếp $BMC$ nên đi qua trung điểm $T$ của cung $BC$ . Tức $M,D,T$ thẳng hàng. Tiếp theo ta chứng minh $N,D,T$ thẳng hàng. Điều này đồng nghĩa ta phải chứng minh hai tam giác $DIT,NAT$ đồng dạng, tức : $\dfrac{AT}{TI}=\dfrac{AN}{ID}\Leftrightarrow \dfrac{AT}{TB}=\dfrac{AI.sin\angle NIA}{r}\Leftrightarrow \dfrac{sin\angle ABT}{sin\dfrac{A}{2}}=\dfrac{sin\angle BGA}{sin\dfrac{A}{2}}\Leftrightarrow sin\angle ABT=sin\angle BGA$ Điều này đúng vì $\angle ABT=180^0-\angle BAT-\angle BTA=180^0-\frac{\angle A+\angle C}{2}=180^0-\angle BGA$ Bài toán hoàn tất.

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/27/geometry-77/

---

## 22. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ , phân giác $AD$ , $P$ là điểm di chuyển trên $AD$ . $E,F$ là hình chiếu của $P$ lên $CA,AB$ . $M$ là trung điểm của $BC$ , $H$ là hình chiếu của $M$ lên $EF$ . Chứng minh $PH$ luôn đi qua một điểm cố định.

<details><summary>Lời giải</summary>

Gọi $N$ là trung điểm của cung $BAC$ của đường tròn $(ABC)$ tâm $O$ . Ta chứng minh $PH$ luôn đi qua $N$ bằng cách gọi $PN$ giao $EF$ tại $H'$ và chứng minh $H$ trùng $H'$ . Gọi $K$ là giao của $AP,EF$ . Dễ thấy hai tam giác vuông $AEP,NCQ$ đồng dạng và có hai đường cao tương ứng là $EK,CM$ . Từ đó dễ có : $\dfrac{MN}{MQ}=\dfrac{KA}{KP}$ Mà do $AN$ song song $EF$ nên $\dfrac{KA}{KP}=\dfrac{H'N}{H'P}$ . Kéo theo $\dfrac{H'N}{H'P}=\dfrac{MN}{MQ}$ . Theo Thales đảo thì $MH'$ song song $AD$ , suy ra $H$ trùng $H'$ . Vậy $PH$ luôn đi qua điểm $N$ cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/27/geometry-76/

---

## 23. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ và điểm $P$ trên cạnh $BC$ . Các đường tròn $(APB),(APC)$ cắt $AC,AB$ tại $E,F$ . $PE,PF$ cắt $AB,AC$ tại $M,N$ . $Q$ là giao của $BN,CM$ . Chứng minh khi $P$ thay đổi thì $PQ$ luôn đi qua một điểm cố định.

<details><summary>Lời giải</summary>

Ta có : $\angle AEB=\angle APB=180^0-\angle APC=180^0-\angle AFC$ Do vậy bốn điểm $A,F,R,E$ đồng viên với $R$ là giao của $BE,CF$ . Từ đó không khó để suy ra $\angle APB=\angle RPC$ . Dễ dàng thấy theo định lí Pappus thì $P,Q,R$ thẳng hàng. Gọi giao của $RPQ$ với đường cao hạ từ $A$ của tam giác $ABC$ là $A'$ . Ta có $\angle RPC=\angle BPA'$ vì đối đỉnh mà $\angle APB=\angle RPC$ nên $\angle BPA'=\angle APB$ . Tam giác $APA'$ có $PB$ là phân giác và đường cao nên cũng là trung trực, tức $A'$ đối xứng với $A$ qua $BC$ . Điểm $A'$ là điểm cố định mà $PQ$ luôn đi qua.

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/27/geometry-75/

---

## 24. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ nội tiếp $(O)$ , $AB<AC$ . Tiếp tuyến tại $A$ của $(O)$ cắt $BC$ tại $T$ . $S$ đối xứng với $T$ qua $AB$ . Trên $AS$ lấy điểm $E$ khác $A$ sao cho $TA=TE$ . $BE$ giao $(O)$ tại $F$ . $AS$ cắt $BC$ tại $D$ . Chứng minh rằng $DA=DE$ .

<details><summary>Lời giải</summary>

Ta có : $\angle EDB=180^0-\angle TAD-\angle ATD=180^0-2\angle TAB-(\angle ABC-\angle TAB)=(180^0-\angle ABC)-\angle TAB=\angle AFC-\angle AFB=\angle EFC$ Như vậy tứ giác $FEDC$ nội tiếp. Đồng thời $TE^2=TA^2=TB.TC$ . Suy ra $\Delta TBE\sim \Delta TEC$ . Ta có các biểu diễn : $\angle AFD=\angle AFB+\angle BFD=\angle AFB+\angle ECD=\angle AFB+\left ( \angle EDB-\angle DEC \right )=\angle AFB+\angle EFC-\angle DEC=\angle AFC-\angle DEC=\angle TAC-\angle DEC$ $\angle FAD=\angle TAF-\angle TAD=\angle TAC+\angle FAC-\angle TAD$ Do đó để chứng minh $DA=DF$ ta chứng minh tam giác $DAF$ cân tại $D$ , tức : $\angle AFD=\angle FAD\Leftrightarrow \angle TAC-\angle DEC=\angle TAC+\angle FAC-\angle TAD\Leftrightarrow \angle FAC+\angle DEC=\angle TAD$ Điều này là đúng vì : $\angle TAD=\angle TEA=\angle ETC+\angle EDB=\angle ETC+\left ( \angle DEC+\angle ECT \right )=\angle DEC+(180^0-\angle TEC)=\angle DEC+(180^0-\angle TBE)=\angle DEC+\angle EBC=\angle DEC+\angle FAC$ Bài toán được chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/26/geometry-74/

---

## 25. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ , phân giác $AD$ . $P,Q$ là hai điểm trên $AD$ sao cho $\angle PAB=\angle QBC$ . $E,F$ là hình chiếu của $P$ lên $CA,AB$ . $H$ là hình chiếu của $Q$ lên $BC$ , $K$ là hình chiếu của $H$ lên $EF$ . Chứng minh $KH$ là phân giác góc $BKC$ .

<details><summary>Lời giải</summary>

Vì $BP,BQ$ đẳng giác trong góc $ABC$ nên theo định lí Steiner về tiêu chuẩn đẳng giác, ta được : $\dfrac{\overline{QD}}{\overline{QA}}.\dfrac{\overline{PD}}{\overline{PA}}=\dfrac{BD^2}{BA^2}$ Theo tính chất phân giác thì $\dfrac{BD}{BA}=\dfrac{DC}{CA}$ từ đó : $\dfrac{\overline{QD}}{\overline{QA}}.\dfrac{\overline{PD}}{\overline{PA}}=\dfrac{DC^2}{CA^2}$ Lại theo định lí Steiner ta được $CP,CQ$ đẳng giác trong $ACB$ . Ta có : $\dfrac{HB}{HC}.\dfrac{EC}{EA}.\dfrac{FA}{FB}=\dfrac{cotB_1}{cotC_1}.\dfrac{cotC_2}{cotA_2}.\dfrac{cotA_1}{cotB_2}=1\;\;\;(\angle A_1=\angle A_2,\angle B_1=\angle B_2,\angle C_1=\angle C_2)$ Vậy theo Ceva thì $AH,BE,CF$ đồng quy. Từ đó áp dụng định lí về chùm điều hòa ta được $KH$ là phân giác góc $BKC$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/26/geometry-73/

---

## 26. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ nội tiếp $(O)$ . Phân giác $BAC$ cắt $(O)$ tại $D$ khác $A$ . $M,N$ là trung điểm của $AB,AC$ . Trung trực của $CA,AB$ cắt các đường tròn $(AMD),(AND)$ theo thứ tự tại $E,F$ sao cho $E,B$ cùng phía với $AC$ và $F,C$ cùng phía với $AB$ . Gọi giao của $EF$ và $MN$ là $P$ . Chứng minh $PA=PD$ .

<details><summary>Lời giải</summary>

Trước hết ta chứng minh $AMED$ là hình thang cân. Gọi $E'$ là giao điểm của $(AMD)$ với đường thẳng qua $M$ song song $AD$ . Ta chứng minh $E$ trùng $E'$ . Gọi $X$ là giao của $AC$ và $(AMD)$ . Dễ thấy $DM=DX$ ( $AD$ là phân giác góc $MAX$ ) và $BD=CD$ . Hơn nữa vì $\angle MDX=\angle BDC\;(=180^0-\angle A)$ nên $\angle BDM=\angle BDC-\angle MDC=\angle MDX-\angle MDC=\angle CDX$ . Từ đó có ngay hai tam giác $CDX$ và $BDM$ bằng nhau. Kéo theo $CX=BM=AM$ mà $AM=E'D$ ( $AME'D$ là hình thang cân) nên $E'D=CX$ . Lại có $\angle E'DA=\angle MAD=\angle DAC\Rightarrow E'D\parallel AX$ . Từ đó $DX=E'C$ , mà $DX=AE'$ vì $AE'DX$ là hình thang cân. Từ đó được $AE'=E'C$ , suy ra $E$ trùng $E'$ . Ta chứng minh xong $AMED$ là hình thang cân. Tương tự $ANFD$ cũng là hình thang cân. Suy ra $ME,NF,AD$ có chung đường trung trực đó là $KOL$ . Cũng dễ thấy $KOL$ phải đi qua $P$ . Vậy $PA=PD$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/26/geometry-72/

---

## 27. (không rõ nguồn thi)

**Đề:** Cho tam giác nhọn $ABC$ nội tiếp $(O)$ trực tâm $H$ , $D$ đối xứng với $H$ qua $BC$ . $BE,CF$ là các đường cao. $DE$ cắt $(O)$ tại $G$ khác $D$ . Chứng minh rằng $BG$ chia đôi $EF$ .

<details><summary>Lời giải</summary>

Gọi $J$ là giao của $BG$ và $EF$ , $K$ là chân đường cao từ $A$ xuống $BC$ . Dễ thấy : $\Delta BFE\sim \Delta KHE\Rightarrow \dfrac{BF}{HK}=\dfrac{EF}{HE}$ Cũng dễ thấy : $\Delta BFJ\sim \Delta DHE\Rightarrow \dfrac{BF}{HD}=\dfrac{FJ}{HE}$ Chú ý vì $HD=2HK$ nên có ngay $EF=2FJ$ suy ra $J$ là trung điểm của $EF$ . Ta phát triển bài toán trên thành bài toán sau : Bài toán : Từ một điểm $Z$ bên ngoài $(O)$ , ta kẻ hai tiếp tuyến $ZA,ZA'$ đến $(O)$ với hai tiếp điểm $A,A'$ . Kẻ cát tuyến $ZBC$ . Các đường cao $BE,CF$ của tam giác $ABC$ gặp nhau tại $H$, $AH$ cắt $(O)$ tại $D$ . $DF$ và $DE$ lần lượt lần nữa gặp $(O)$ tại $L,G$ . Chứng minh rằng $BG,CL$ gặp nhau tại một điểm trên $AA'$ . Lời giải : Từ bài toán trên ta được $BG,CL$ gặp nhau tại trung điểm của $EF$ . Như vậy bài toán hoàn tất nếu ta chỉ ra được $AA'$ cũng đi qua trung điểm của $EF$ . Gọi $J$ là giao của $EF$ và $AA'$ . Ta gọi $X$ là giao của $AA'$ và $BC$ thì $(ZX,BC)=-1$ (hàng điều hòa về đường tròn) Suy ra : $A(ZJ,FE)=-1$ Cũng dễ dàng chứng minh được $EF$ song song $AZ$ do cùng vuông góc với $OA$ . Từ đó theo định lí về chùm điều hòa ta có $J$ là trung điểm của $EF$ . Bài toán được chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/25/geometry-71/

---

## 28. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ nội tiếp $(O)$ ngoại tiếp $(I)$ với $D,E,F$ là tiếp điểm với $(I)$ trên $BC,CA,AB$ . $M$ là trung điểm của $BC$ . $H$ là hình chiếu của $M$ lên $EF$ . Chứng minh rằng $IH$ và trung trực của $BC$ gặp nhau trên $(O)$ .

<details><summary>Lời giải</summary>

Gọi $I_b,I_c$ theo thứ tự là tâm bàng tiếp góc $B,C$ của tam giác $ABC$ . $K,L$ theo thứ tự là giao của $CI,BI$ với $EF$ . Gọi $N$ là giao của $OM$ và $(O)$ , tức $N$ là điểm chính giữa cung $BAC$ . Ta chứng minh $N,H,I$ thẳng hàng. Ta có : $\angle NCI_b=\angle BCI_b-\angle NCB=\left ( \angle C+\angle ACI_b \right )-\left ( 90^0-\angle MNC \right )=\left ( \angle C+90^0-\dfrac{\angle C}{2} \right )-(90^0-\dfrac{\angle A}{2})=\dfrac{\angle A+\angle C}{2}=\angle BI_bC$ Như vậy tam giác $NCI_b$ cân mà $\angle I_cCI_b=90^0$ nên $N$ là tâm ngoại tiếp tam giác $I_cCI_b$ . Suy ra $N$ là trung điểm của $I_bI_c$ . Ta dễ dàng có được : $\angle BKC=\angle BLC=90^0$ và $B,K,C,L$ đồng viên. Từ đó : $\angle KLM=\angle KLB+\angle BLM=\angle KCB+\angle LBM=\dfrac{\angle +\angle C}{2}=\angle LKM$ Tức tam giác $KLM$ cân, có đường cao $MH$ nên cũng là trung tuyến, tức $H$ là trung điểm của $KL$ . Dễ thấy $KL$ song song $I_bI_c$ do cùng vuông góc với $AI$ . Trong tam giác $II_cI_b$ có $K,L$ theo thứ tự thuộc hai cạnh bên mà $KL$ song song với đáy. $H,N$ theo thứ tự là trung điểm của $KL,I_bI_c$ nên $H,I,N$ thẳng hàng.

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/25/geometry-70/

---

## 29. (International Mathematical Olympiad 2014)

**Đề:** (International Mathematical Olympiad 2014) Cho tam giác $ABC$ . $P,Q$ là các điểm thuộc cạnh $BC$ sao cho $\angle PAB=\angle C$ và $\angle CAQ = \angle B$ . $M,N$ thuộc tia đối của tia $PA,QA$ sao cho $P$ là trung điểm của $AM$ và $Q$ là trung điểm của $AN$ . Chứng minh rằng $BM,CN$ gặp nhau trên đường tròn ngoại tiếp tam giác $ABC$ .

<details><summary>Lời giải</summary>

Dễ dàng thấy rằng hai tam giác $PAB,QCA$ đồng dạng, kéo theo : $\dfrac{PB}{QA}=\dfrac{PA}{QC}\Rightarrow \dfrac{PB}{QN}=\dfrac{PM}{QC}\;\;\;\;(QA=QN,PA=PM)$ Hơn nữa cũng dễ thấy $\angle BPN=\angle NQC$ , suy ra hai tam giác $BPM,NQC$ đồng dạng. Suy ra : $\angle PMB=\angle QCN\Rightarrow \angle PMI=\angle PCI$ Do đó bốn điểm $P,I,M,C$ đồng viên. Kéo theo : $\angle CMI=\angle CPM=\angle APB=\angle BAC$ Điều này đồng nghĩa $ABIC$ nội tiếp, suy ra $I$ thuộc đường tròn $(ABC)$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/25/geometry-69/

---

## 30. (Chọn đội tuyển Trại hè Hùng Vương 2014 THPT Chuyên Nguyễn Tất Thành, Yên Bái)

**Đề:** Cho tam giác $ABC$ có ba đường cao $A_1,B_1,C_1$ . Gọi $E$ là điểm đối xứng với $A$ qua trung trực của $BC$ . $B_2,C_2$ theo thứ tự đối xứng với $B_1$ qua trung điểm $AC$ , $C_1$ qua trung điểm $AB$ . a) Chứng minh $EA_1$ đi qua trọng tâm tam giác $ABC$ b) Chứng minh bốn điểm $A,E,B_2,C_2$ đồng quy.

<details><summary>Lời giải</summary>

a) Gọi $M$ là trung điểm của $BC$ và $G$ là giao của $AM$ và $EA_1$ . Dễ thấy hai tam giác $AGE$ và $MGA_1$ đồng dạng, suy ra : $\dfrac{AG}{GM}=\dfrac{AE}{A_1M}=2$ Từ đó $G$ là trọng tâm tam giác $ABC$ . Vậy $EA_1$ luôn đi qua trọng tâm tam giác $ABC$ . b) Dễ dàng thấy $AC=BE,AB=EC,BC_2=AC_1,B_2C=AB_1$ . Từ đó xét hai tam giác $EB_2C,EC_2B$ : $\angle ACE=\angle ABE \dfrac{B_2C}{CE}=\dfrac{AB_1}{AB}=\dfrac{AC_1}{AC}=\dfrac{BC_2}{BE}$ Như vậy hai tam giác này đồng dạng, kéo theo : $\angle EB_2C=\angle EC_2B\Rightarrow EB_2A=\angle AC_2E$ Vậy bốn điểm $A,E,B_2,C_2$ đồng viên.

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/07/geometry-67/

---

## 31. (Russia Sharygin Geometry Olympiad 2013)

**Đề:** Cho tam giác $ABC$ , phân giác $AD$ . Gọi $M,N$ theo thứ tự là hình chiếu vuông góc của $B,C$ xuống $AD$ . Đường tròn đường kính $MN$ cắt $BC$ theo thứ tự tại $X,Y$ . Chứng minh $\angle BAX=\angle CAY$ .

<details><summary>Lời giải</summary>

Bổ đề : (Định lý Steiner) Cho tam giác $ABC$ và hai điểm $D,E$ trên cạnh $BC$ . Khi đó $AD,AE$ đẳng giác trong góc $BAC$ khi và chỉ khi : $\dfrac{\overline{BD}}{\overline{DC}}.\dfrac{\overline{BE}}{\overline{EC}}=\dfrac{AB^2}{AC^2}$ Chứng minh bổ đề : Gỉa sử $AD,AE$ đẳng giác trong góc $BAC$ . Ta có : $\dfrac{\overline{BD}}{\overline{DC}}=\dfrac{S_{ABD}}{S_{ADC}}=\dfrac{AD.AB.sin\angle BAD}{AD.AC.sin\angle DAC}=\dfrac{AB}{AC}.\dfrac{sin\angle BAD}{sin\angle DAC}$ Tương tự $\dfrac{\overline{BE}}{\overline{EC}}=\dfrac{AB}{AC}.\dfrac{sin\angle BAE}{sin\angle CAE}$ Mà lại có $\angle BAD=\angle CAE,\angle BAE=\angle DAC$ nên có : $\dfrac{\overline{BD}}{\overline{DC}}.\dfrac{\overline{BE}}{\overline{EC}}=\dfrac{AB^2}{AC^2}$ Bây giờ giả sử $AD,AE$ thỏa mãn hệ thức đề bài. Vẽ đường đẳng giác $AD'$ với $AE$ , tương tự trên ta được : $\dfrac{\overline{BD'}}{\overline{D'C}}.\dfrac{\overline{BE}}{\overline{EC}}=\dfrac{AB^2}{AC^2}$ Mà $\dfrac{\overline{BD}}{\overline{DC}}.\dfrac{\overline{BE}}{\overline{EC}}=\dfrac{AB^2}{AC^2}$ nên suy ra : $\dfrac{\overline{BD}}{\overline{DC}}=\dfrac{\overline{BD'}}{\overline{D'C}}\Rightarrow D\equiv D'$ Định lí Steiner về tiêu chuẩn đẳng giác được chứng minh. Trở lại bài toán : Chú ý $BM$ là tiếp tuyến của $(XY)$ : $BM^2=\overline{BX}.\overline{BY}$ Tương tự $NC^2=\overline{CY}.\overline{CX}$ Suy ra : $\dfrac{BM^2}{NC^2}=\dfrac{\overline{BX}}{\overline{XC}}.\dfrac{\overline{BY}}{\overline{YC}}$ Cũng dễ thấy hai tam giác vuông $ABM,ACN$ đồng dạng nên $\dfrac{AB}{AC}=\dfrac{BM}{CN}$ . Từ đó có ngay : $\dfrac{AB^2}{AC^2}=\dfrac{\overline{BX}}{\overline{XC}}.\dfrac{\overline{BY}}{\overline{YC}}$ Áp đụng định lí Steiner, ta được $AX,AY$ đẳng giác trong góc $BAC$ tức $\angle BAX=\angle CAY$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/04/geometry-66/

---

## 32. (Russia Sharygin Geometry Olympiad 2013)

**Đề:** Cho tam giác $ABC$ có phân giác $BD$ . $I_a,I_c$ theo thứ tự là tâm nội tiếp các tam giác $ABD,BDC$ . $I_aI_c$ giao $AC$ tại $Q$ . Chứng minh $\angle QBD=90^0$ .

<details><summary>Lời giải</summary>

Gọi $I$ là tâm nội tiếp tam giác. Áp dụng định lý Menelaus cho tam giác $IAC$ và đường thẳng $QI_aI_c$ : $\dfrac{QA}{QC}.\dfrac{I_cC}{I_cI}.\dfrac{I_aI}{I_aA}=1\;\;(1)$ Theo tính chất phân giác : $\dfrac{I_cC}{I_cI}=\dfrac{BC}{BI},\dfrac{I_aI}{I_aA}=\dfrac{BI}{BA}\Rightarrow \dfrac{I_cC}{I_cI}.\dfrac{I_aI}{I_aA}=\dfrac{BC}{BA}\;\;\;(2)$ Từ $(1)(2)$ ta được : $\dfrac{QA}{QC}=\dfrac{BA}{BC}=\dfrac{AD}{AC}\Rightarrow (QD,AC)=-1$ Lại có $BD$ là phân giác góc $ABC$ nên $BQ$ vuông góc $BD$ hay $\angle QBD=90^0$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/03/geometry-65/

---

## 33. (Rioplatense Mathematical Olympiad Level 3 2008)

**Đề:** Cho tam giác $ABC$ có $AB

<details><summary>Lời giải</summary>

Gọi $L$ là giao của $YZ$ và $BC$ . Ta có : $\angle TLX=\angle AYZ-\angle ACB=\dfrac{180^0-\angle A}{2}-\angle C \angle TKX=\angle AKU=\angle ACU=(180^0-\angle AUC)-\angle UAC=\angle B-\dfrac{\angle UOC}{2}=\angle B-\dfrac{180^0-2\angle OUC}{2}=\angle B-\dfrac{180^0-\angle A}{2}$ Dễ thấy $\dfrac{180^0-\angle A}{2}-\angle C=\angle B-\dfrac{180^0-\angle A}{2}$ do đó có $\angle TLX=\angle TKX$ . Do vậy tứ giác $TXKL$ nội tiếp. Ta có $(LX,BC)=-1$ và $BX$ là phân giác góc $BKC$ suy ra $LK$ vuông góc $LX$ . Từ đó có ngay $TX$ vuông góc $TL$ hay $TX$ vuông góc $YZ$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/03/geometry-64/

---

## 34. (Iran Team Selection Test 2013)

**Đề:** Cho tam giác $ABC$ đường cao $AH$ . $I,J$ theo thứ tự là tâm bàng tiếp góc $B,C$ của các tam giác $ABH,ACH$ . Gọi $P$ là tiếp điểm của $BC$ với đường tròn nội tiếp tam giác $ABC$ . Chứng minh bốn điểm $I,J,P,H$ đồng viên.

<details><summary>Lời giải</summary>

Gọi $X,Y$ theo thứ tự là hình chiếu của $J,I$ xuống $BC$ Ta có thể thấy : $XC=\dfrac{AH+AC+HC}{2}$ và $PC=\dfrac{AC+BC-AB}{2}$ Suy ra : $XP=XC-PC=\dfrac{AH+AC+HC-AC-BC+AB}{2}=\dfrac{AH+AB-HB}{2}$ Ta có : $AH=c.sinB,HB=c.cosB$ Suy ra : $XP=\dfrac{c(1+sinB-cosB)}{2}$ . Tương tự $YP=\dfrac{b(1+sinC-cosC)}{2}$ . Theo công thức tính bán kính đường tròn bàng tiếp của một tam giác, ta có : $JX=\dfrac{AH+HC+CA}{2}.tan\dfrac{C}{2}=\dfrac{b(1+sinC+cosC)}{2}.tan\dfrac{C}{2}$ Tương tự $IY=\dfrac{AH+HB+BA}{2}.tan\dfrac{B}{2}=\dfrac{c(1+sinB+cosB)}{2}.tan\dfrac{B}{2}$ . Ta chứng minh : $\dfrac{JX}{XP}=\dfrac{YP}{IY}\Leftrightarrow \dfrac{1+sinC+cosC}{1+sinB-cosB}.tan\dfrac{C}{2}.tan\dfrac{B}{2}=\dfrac{1+sinC-cosC}{1+sinB+cosB}$ Ta có thể dễ dàng chứng minh được đẳng thức lượng giác này. Suy ra hai tam giác vuông $JXP$ và $PIY$ đồng dạng. Kéo theo $\angle JPX=\angle PIY$ mà $\angle PIY+\angle IPY=90^0$ nên $\angle JPX+\angle IPY=90^0$ . Ta được $\angle JPI=90^0$ . Dễ dàng thấy $\angle JHI=90^0$ do tính chất phân giác hai góc kề bù. Vậy bốn điểm $I,J,H,P$ đồng viên.

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/03/geometry-63/

---

## 35. (Japanese Mathematical Olympiad Finals 2013)

**Đề:** Cho tam giác nhọn $ABC$ , trực tâm $H$ . Đường tròn đường kính $AH$ và một đường tròn qua $B,C$ cắt nhau tại hai điểm $X,Y$ . Gọi $D$ là chân vuông góc từ $A$ xuống $BD$ . Gọi $K$ là hình chiếu của $D$ xuống $XY$ . Chứng minh rằng $\angle BKD=\angle CKD$ .

<details><summary>Lời giải</summary>

Gọi $E,F$ theo thứ tự là chân vuông góc hạ từ $B,C$ xuống $CA,AB$ . Dễ dàng thấy được $E,F$ thuộc đường tròn đường kính $AH$ . Gọi $I$ là giao của $XY$ và $BC$ . Ta có : $IX.IY=IF.IE=P_{I/(AH)}$ Hơn nữa vì tứ giác $XYCB$ nội tiếp nên $IB.IC=IX.IY=P_{I/(BCYX)}$ Như vậy ta có $P_{I/(AH)}=P_{I/(BCYX)}$ . Suy ra $I$ thuộc trục đẳng phương của hai đường tròn, tức $I$ thuộc $XY$ . Dễ thấy $(ID,BC)=-1$ (hàng điều hòa tứ giác toàn phần). Do vậy theo tính chất của hàng điểm điều hòa ta có $KD$ là phân giác góc $BKC$ . Đây là điều cần chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/02/geometry-62/

---

## 36. (Balkan Mathematical Olympiad 2011)

**Đề:** Cho tứ giác nội tiếp $ABCD$ không là hình thang với $F,G$ là trung điểm của $AB,CD$ . Đường thẳng $l$ qua $G$ song song $AB$ . $K,H$ theo thứ tự là hình chiếu của $E$ xuống $l,CD$ trong đó $E$ là giao của $AC,BD$ . Chứng minh $HK$ vuông góc $EF$ .

<details><summary>Lời giải</summary>

Gọi $U,V$ theo thứ tự là giao của các cặp $(EF,CD),(EG,AB)$ . $HK$ gặp $EF$ tại $X$ . $EF$ gặp $l$ tại $Y$ . Dễ thấy hai tam giác $AEB,DEC$ đồng dạng nên $\dfrac{AB}{EB}=\dfrac{DC}{EC}\Rightarrow \dfrac{FB}{EB}=\dfrac{GC}{EC}\;(AB=2FB,DC=2GC)$ . Từ đó có hai tam giác $FEB,GEC$ đồng dạng, suy ra $\angle FEB=\angle GEC$ . Ta có : $\angle VGU=\angle GEC+\angle DCA=\angle FEB+\angle ABD=\angle VFU$ Hơn nữa có $\angle VFU=\angle EYH$ do là hai góc so le trong. Và có $EKHG$ là tứ giác nội tiếp nên $\angle VGU=\angle EHX$ . Như vậy ta thu được $\angle EYH=\angle EHX$ . Kết hợp với việc $\angle EHY=90^0$ ta có ngay $\angle EXH=90^0$ . Như vậy $HK$ vuông góc $EF$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/02/geometry-61/

---

## 37. (Balkan Mathematical Olympiad 2008)

**Đề:** Cho tam giác nhọn $ABC$ có $AC>BC$ . Gọi $O$ là tâm ngoại tiếp và $H$ là trực tâm tam giác, $F$ là chân vuông góc hạ từ $C$ . $P$ là điểm của $AB$ sao cho $FA=FP$ . $M$ là trung điểm của $BC$ . $PH$ giao $BC$ tại $X$ , $Y$ là giao của $OM$ và $FX$ , $Z$ là giao của $FO$ và $AC$ . Chứng minh bốn điểm $F,M,Y,Z$ đồng viên.

<details><summary>Lời giải</summary>

Gọi $R$ là giao của $CH$ và $(O)$ . $RB$ giao $AC$ tại $J$ . $AR$ giao $BC$ tại $K$ . $AP$ giao $JK$ tại $W$ . Dễ thấy tứ giác $ARPH$ là hình thoi nên $HP\parallel AK$ . Suy ra $\dfrac{BX}{BK}=\dfrac{BP}{BA}\;\;\;(1)$ . Chú ý ta có $J(KF,BC)=-1$ (hàng điều hòa tứ giác toàn phần) hay $J(WF,BA)=-1$ . Suy ra $\dfrac{WB}{WA}=\dfrac{FB}{FA}$ . Kéo theo : $\dfrac{FA}{FB}=\dfrac{WA}{WB}=\dfrac{AB+BW}{BW}=\dfrac{AB}{BW}+1\Leftrightarrow \dfrac{FA-FB}{FB}=\dfrac{AB}{BW}\Leftrightarrow \dfrac{FP-FB}{FB}=\dfrac{AB}{BW}\Leftrightarrow \dfrac{BP}{FB}=\dfrac{AB}{BW}\Leftrightarrow \dfrac{FB}{BW}=\dfrac{BP}{BA}\;\;\;\;(2)$ Từ $(1)(2)$ ta suy ra $\dfrac{BX}{BK}=\dfrac{FB}{BW}$ . Theo định lí Thales đảo ta có $FX\parallel JW$ hay $FX\parallel JK$ . Theo định lí Brocard ta có $O$ là trực tâm tam giác $JFK$ , kéo theo $OF$ vuông góc $JK$ . Ta được $OF$ vuông góc $FX$ . Từ đó dễ dàng chỉ ra được điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/02/geometry-60/

---

## 38. (Đề xuất Olympic Duyên hải và Đồng bằng Bắc Bộ toán 10 THPT Chuyên Bắc Giang, tỉnh Bắc Giang 2013-2014)

**Đề:** Cho tứ giác $ABCD$ nội tiếp $(O)$ có hai đường chéo giao nhau tại $I$ . $M,N$ theo thứ tự là giao điểm thứ hai của các cặp đường tròn $AOB,COD$ và $BOC,AOD$ . Chứng minh rằng bốn điểm $I,O,M,N$ cùng thuộc một đường tròn.

<details><summary>Lời giải</summary>

Ta có : $\angle ANB=\angle ADO+\angle BCO=\dfrac{180^0-\angle AOD}{2}+\dfrac{180^0-\angle BOC}{2}=180^0-\angle ACD-\angle BAC=180^0-\angle ACD-\angle BDC=\angle DIC=\angle AIB$ Như vậy tứ giác $AINB$ nội tiếp. Tương tự ta có $DINC$ nội tiếp. Khi đó ta có $AB,IN,DC$ đồng quy tại tâm đẳng phương $U$ của ba đường tròn $(AINB),(DINC),(O)$ . Cũng dễ thấy $AD,NO,BC$ đồng quy tại tâm đẳng phương $V$ của ba đường tròn $(AOD),(BOC),(O)$ . Theo định lí Brocard ta có $I$ là trực tâm tam giác $OUV$ suy ra $UN$ vuông góc $VO$ hay $IN$ vuông góc $NO$ . Từ đó được $\angle INO=90^0$ . Tương tự $\angle IMO=90^0$ . Do đó bốn điểm $I,O,M,N$ đồng viên.

</details>

Nguồn: https://julielltv.wordpress.com/2014/07/01/geometry-59/

---

## 39. (Balkan Mathematical Olympiad 2014)

**Đề:** Cho hình thang $ABCD$ nội tiếp đường tròn đường kính $AB$ . Hai đường chéo $AC,BD$ cắt nhau tại $E$ . Đường tròn $(B,BE)$ cắt $(ABCD)$ tại $K,L$ sao cho $K$ nằm trên nửa đường tròn chứa $C$ . Đường thẳng qua $E$ vuông góc $BD$ cắt $CD$ tại $M$ . Chứng minh $KM$ vuông góc $DL$ .

<details><summary>Lời giải</summary>

Gọi $X$ là giao của $ME$ và $CB$ . Tam giác $XEB$ vuông tại $E$ và có đường cao $EC$ nên $XE^2=XC.XB$ , hay $P_{X/(B)}=P_{X/(ABCD)}$ . Như vậy $X$ thuộc trục đẳng phương của hai đường tròn, tức $X$ thuộc $KL$ . Chú ý vì $ME$ song song $AD$ nên $\angle XCM=\angle DAB=\angle XMC$ . Dễ thấy $XL$ vuông góc $AB$ nên $XL$ vuông góc $CD$ . Suy ra $XL$ là trung trực của $MC$ . Ta được $\angle CML=\angle MCL=\angle DKL$ . Mà $\angle CML+\angle MLK=90^0$ nên $\angle DKL+\angle MLK=90^0$ . Như vậy có $LM$ vuông góc $DK$ , lại có $CD$ vuông góc $KL$ nên $M$ là trực tâm tam giác $DKL$ . Ta được $KM$ vuông góc $DL$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/30/geometry-58/

---

## 40. (Balkan Mathematical Olympiad 2013)

**Đề:** Cho tam giác $ABC$ . Đường tròn bàng tiếp góc $A$ tiếp xúc $AB,AC$ tại $P,Q$ . Đường tròn bàng tiếp góc $B$ tiếp xúc $BA,BC$ tại $M,N$ . Gọi $K,L$ theo thứ tự là hình chiếu của $C$ xuống $MN,PQ$ . Chứng minh tứ giác $MKLP$ nội tiếp.

<details><summary>Lời giải</summary>

Gọi $I$ là tâm nội tiếp tam giác $ABC$ và $O_a,O_b$ theo thứ tự là tâm bàng tiếp góc $A,B$ của tam giác $ABC$ . Dễ dàng tính được : $CL=CQ.sin\angle CQL=CQ.sin\dfrac{\pi -A}{2}=(p-b).cos\dfrac{A}{2}$ Tương tự $CK=\left ( p-a \right ).cos\dfrac{B}{2}$ . Hơn nữa : $BI=\dfrac{p-b}{cos\dfrac{B}{2}},AI=\dfrac{p-c}{cos\dfrac{A}{2}}$ Từ đó ta được : $\dfrac{CL}{CK}=\dfrac{BI}{AI}$ Chú ý các cặp $(BI,CK),(AI,CL)$ song song nên ta được $\angle AIB=\angle LCK$ . Từ đó suy ra hai tam giác $AIB,LCK$ đồng dạng. Kéo theo : $\angle IAB=\angle CLK\Rightarrow \angle BMN=\angle MLQ\;\;(\angle BMN=90^0-\angle IAB,\angle MLQ=90^0-\angle CLK)$ Ta được tứ giác $MKLP$ nội tiếp.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/30/geometry-57/

---

## 41. (Iran National Olympiad 3rd Round 2013)

**Đề:** Cho tam giác $ABC$ nội tiếp $(O)$ . Các đường cao $BE,CF$ cắt nhau tại $H$ . $AH$ cắt $(O)$ tại $D$ . Qua trung điểm $T$ của $AH$ , kẻ đường thẳng song song với $EF$ cắt $AB,AC$ tại $X,Y$ . Chứng minh $\angle XDE=\angle YDE$ .

<details><summary>Lời giải</summary>

Ta có : $\angle AXY=\angle AEF=\angle ACB=\angle ADB$ Như vậy ta được bốn điểm $X,T,B,D$ đồng viên. Chú ý do $T$ là trung điểm của cạnh huyền $AH$ trong tam giác vuông $AHE$ nên $\angle TEH=\angle AHE=\angle ACB=\angle AXY$ Do vậy ta cũng được bốn điểm $X,T,E,B$ đồng viên. Kéo theo năm điểm $X,T,B,D,E$ đồng viên. Suy ra : $\angle YTE=\angle XDE$ Tương tự $\angle XTF=\angle YDF$ Hơn nữa lại có : $\angle YTE=\angle TEF=\angle TFE=\angle XTF\;\;\;(TE=TF=AH/2)$ Suy ra hai góc $YDF,XDE$ bằng nhau. Từ đó dẫn đến : $\angle XDE = \angle YDF$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/27/geometry-56/

---

## 42. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ có trực tâm $H$ và $M$ là trung điểm $BC$ . Phân giác góc $A$ cắt $HM$ tại $K$ . Đường tròn thay đổi qua $A,K$ cắt $AB,AC$ theo thứ tự tại $J,L$ . a) Chứng minh rằng trực tâm tam giác $AJL$ luôn thuộc một đường thẳng cố định. Gọi $(d)$ là đường thẳng này b) Gọi $P$ là giao điểm của $(d)$ với $HM$ . Chứng minh $HP=HK$ .

<details><summary>Lời giải</summary>

a) Gọi $U,V$ lần lượt là điểm đối xứng của $K$ qua $AB,AC$ . Dễ thấy $UV$ cố định. Do $UV$ là đường thẳng Steiner của tam giác $ALJ$ nên $UV$ luôn đi qua trực tâm của tam giác này. Như vậy trực tâm tam giác $ALJ$ luôn thuộc đường thẳng cố định. b) Gọi $O$ là tâm ngoại tiếp tam giác $ABC$ Gọi $X,Y$ lần lượt là giao của $(KU,AB),(KV,AC)$ . $AK$ cắt $(O)$ tại $I$ . $S,T$ theo thứ tự là giao của đường thẳng qua $I$ vuông góc với $AB$ và đường thẳng qua $I$ vuông góc với $AC$ với $XY$ . Ta chứng minh $XY$ là đường thẳng Steiner của tam giác $ABC$ ứng với điểm Anti-Steiner $I$ . Ta có : $\dfrac{AK}{IK}=\dfrac{AH}{IM}\Rightarrow \dfrac{AK}{AI}=\dfrac{AH}{AH+IM}$ Chú ý có $IM=MC.tan\dfrac{A}{2}=OM.tan\dfrac{\angle BOC}{2}.tan\dfrac{A}{2}=OM.tanA.tan\dfrac{A}{2}$ và $2OM=AH$ Suy ra : $AK=AI.\dfrac{2}{2+tanA.tan\dfrac{A}{2}}$ Dễ có : $AX=AK.cos\dfrac{A}{2}=AI.\dfrac{2cos\dfrac{A}{2}}{2+tanA.tan\dfrac{A}{2}}$ Ta sẽ chứng minh : $XI^2=IK.IA\Leftrightarrow AX^2+AI^2-2AX.AI.cos\dfrac{A}{2}=(AI-AK).AI\Leftrightarrow AX^2=2AX.AI.cos\dfrac{A}{2}-AK.AI\Leftrightarrow \dfrac{4.cos^2\dfrac{A}{2}}{(2+tanA.tan\dfrac{A}{2})^2}=\dfrac{4cos^2\dfrac{A}{2}}{2+tanA.tan\dfrac{A}{2}}-\dfrac{2}{2+tanA.tan\dfrac{A}{2}} \Leftrightarrow \dfrac{2cos^2\dfrac{A}{2}}{2+tanA.tan\dfrac{A}{2}}=2cos^2\dfrac{A}{2}-1\Leftrightarrow 2cos^2\dfrac{A}{2}+tanA.sinA=2+tanA.tan\dfrac{A}{2}$ Không khó để chứng minh đẳng thức này. Như vậy ta có $XI^2=IK.IA$ suy ra $\angle KXI=\angle XAK=\angle YXK$ Hay $XK$ là phân giác góc $YXI$ , từ đó có $\angle IXB=\angle AXY=\angle SXB$ . Điều này đồng nghĩa $XB$ là phân giác của tam giác $SXI$ mà $XB$ đã là đường cao nên tam giác $SXI$ cân. Tương tự tam giác $IYT$ cân. Suy ra $ST$ là đường thẳng Steiner ứng với điểm Anti-Steiner $I$ của tam giác $ABC$ . Do vậy $ST$ đi qua $H$ hay $XY$ đi qua $H$ . Khi đó để ý $XHY$ là đường trung bình của tam giác $UKV$ ta thu được ngay $HP=HK$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/27/geometry-55/

---

## 43. (Iran National Olympiad 3rd Round 2013)

**Đề:** Cho ngũ giác $ABCDE$ nội tiếp $(O)$ và gọi $T$ là giao của $BE,AD$ . Đường thẳng qua $T$ song song $CD$ cắt $AB,CE$ tại $X,Y$ . Chứng minh đường tròn ngoại tiếp tam giác $AXY$ tiếp xúc với $(O)$ .

<details><summary>Lời giải</summary>

Chú ý $XY$ song song $CD$ nên : $\angle TYD=\angle TDC=\angle AEY$ Vậy ta được tứ giác $ATYE$ nội tiếp. Kéo theo $\angle AYX=\angle AEB\;\;\;\;(1)$ Kẻ tiếp tuyến $Ax$ của $(AXY)$ như hình vẽ. Khi đó theo tính chất tiếp tuyến : $\angle xAB=\angle AYX\;\;\;\;(2)$ Từ $(1)(2)$ suy ra $\angle xAB=\angle AEB$ . Nên $Ax$ cũng là tiếp tuyến của $(O)$ . Ta có điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/26/geometry-54/

---

## 44. (Iran National Olympiad Second Round 2007)

**Đề:** $M$ là trung điểm của cạnh $BC$ trong tam giác $ABC$ vuông tại $A$ . $D$ là điểm trên $AC$ thỏa mãn $AM=AD$ . Đường tròn ngoại tiếp các tam giác $AMN,BDC$ giao nhau lần nữa tại $P$ . Chứng minh $PC$ là phân giác trong góc $ACB$ .

<details><summary>Lời giải</summary>

Ta có : $\angle ADP=\angle PBM$ (tứ giác $PDCB$ nội tiếp) $\angle PMB=\angle PAD$ (tứ giác $MPAC$ nội tiếp) Do đó có ngay hai tam giác $PAD,MPB$ đồng dạng. Mà $AD=AM=MB$ nên hai tam giác này bằng nhau. Suy ra $PA=PM$ . Dẫn đến $PC$ là phân giác trong góc $ACB$

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/26/geometry-53/

---

## 45. (Iran National Olympiad Second Round 2010)

**Đề:** Hai đường tròn $(w_1),(w_2)$ gặp nhau tại $D,P$ . $A,B$ tương ứng thuộc $(w_1),(w_2)$ sao cho $AB$ là tiếp tuyến chung của hai đường tròn và $D$ gần $AB$ hơn $P$ . $AD$ lần nữa gặp $(w_2)$ tại $C$ . Gọi $M$ là trung điểm của $BC$ . Chứng minh rằng $\angle DPM=\angle BDC$

<details><summary>Lời giải</summary>

Gọi $K$ là giao của $DP$ và $AB$ . Ta có $KA^2=KD.KP=KB^2$ nên $K$ là trung điểm của $AB$ . Ta thấy : $\angle BAP=\angle BAD+\angle DAP=\angle APD+\angle DAP=\angle PDC=\angle PBC$ Cùng với $\angle ABP=\angle BCP$ ta được : $\Delta BCP\sim \Delta ABP\Rightarrow \dfrac{BC}{BA}=\dfrac{PC}{PB}\Rightarrow \dfrac{MC}{KB}=\dfrac{PC}{PB}\;\;\;(AB=2KB,BC=2MC)$ Từ đó dễ dàng suy ra hai tam giác $KBP,MCP$ đồng dạng. Nên : $\angle MPC=\angle DPB\Rightarrow \angle BPC=\angle DPM\Rightarrow \angle BDC=\angle DPM$ Điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/26/geometry-52/

---

## 46. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ và một điểm $O$ thay đổi trên đoạn $BC$ . Đường tròn tâm $O$ bán kính $OA$ cắt $AB,AC$ theo thứ tự tại $M,N$ . Chứng minh trực tâm tam giác $AMN$ luôn thuộc một đường cố định.

<details><summary>Lời giải</summary>

Kẻ đường cao $BQ,CR$ của tam giác $ABC$ . $X,Y$ lần lượt đối xứng với $A$ qua $R,Q$ . Dễ thấy $X,Y$ cố định. Ta chứng minh $H$ thuộc $XY$ . Gọi $J$ là chân vuông góc hạ từ $O$ xuống $MN$ . Hai tam giác vuông $MOJ,BAQ$ có $\angle MOJ=\angle BAQ=\dfrac{1}{2}\angle MON$ nên chúng đồng dạng. Suy ra : $\dfrac{OJ}{OM}=\dfrac{AQ}{AB}\Rightarrow \dfrac{AH}{OM}=\dfrac{AY}{AB}\;\;(AH=2OJ,AY=2AQ)\Rightarrow \dfrac{AH}{AO}=\dfrac{AY}{AB}$ Lại có $\angle HAY=\angle OAB$ do $AO,AH$ đẳng giác trong góc $BAC$ nên ta suy ra hai tam giác $AHY,AOB$ đồng dạng. Suy ra : $\angle AXH=\angle ABC$ Mặt khác dễ thấy $XY$ chính là đường đối song với $BC$ nên $\angle AYX=\angle ABC$ . Dẫn đến : $\angle AYH=\angle AYX$ Vậy $H,X,Y$ thẳng hàng hay $H$ thuộc đường thẳng $XY$ cố định với $X,Y$ xác định như trên.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/25/geometry-51/

---

## 47. (Iran National Olympiad Second Round 2013)

**Đề:** Từ điểm $P$ nằm ngoài đường tròn $(C)$ , ta kẻ hai tiếp tuyến $PA,PB$ với $A,B$ là các tiếp điểm. $K$ là một điểm trên đoạn $AB$ . Gỉa sử đường tròn ngoại tiếp tam giác $PBK$ cắt $(C)$ tại $T$ . Gọi $P'$ là điểm đối xứng với $P$ qua $A$ . Chứng minh rằng $\angle PBT=\angle P'KA$ .

<details><summary>Lời giải</summary>

Kẻ đường kính $AOX$ của $(C)$ với $O$ là tâm của $(C)$ và gọi $L$ là giao của $OP$ với $(PBK)$ . Ta sẽ chứng minh $T,L,X$ thẳng hàng. Thật vậy, ta có $\angle BTL=\angle BPL=\angle BAX=\angle BTX$ , suy ra $T,L,X$ thẳng hàng. Xét hai tam giác $TAK$ và $TBP$ : $\angle AKT=\angle BPT \angle TAK=\angle TXB=\angle PBT$ Suy ra hai tam giác này đồng dạng. Kéo theo : $\dfrac{BT}{AT}=\dfrac{BP}{AK}=\dfrac{AP'}{AK}\;\;\;\;(1)$ Cũng dễ dàng thấy được : $\angle ATB=90^0+\angle BTX=90^0+\angle BAX=\angle KAP'\;\;\;(2)$ Từ $(1)(2)$ suy ra : $\Delta KAP'\sim \Delta ATB\Rightarrow \angle P'KA=\angle TAB=\angle PBT$ Đây là điều cần chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/25/geometry-50/

---

## 48. (Iran National Olympiad Second Round 2013)

**Đề:** Trung điểm của cung nhỏ $BC$ của đường tròn ngoại tiếp tam giác $ABC$ là $P$ . Gỉa sử đường cao từ $A$ cắt $(ABC)$ tại $N$ . Qua $O$ lần lượt kẻ $OK,OL$ song song $MB,MC$ với $K,L$ lần lượt thuộc $AB,AC$ . Chứng minh $NK=NL$ .

<details><summary>Lời giải</summary>

Ta có : $\angle OLA+\angle OKA=\angle MCA+\angle MBA=180^0$ Vậy ta được tứ giác $AKOL$ nội tiếp. Gọi $S$ là giao của $AN$ và $(AKOL)$ . Ta có $\angle ANM=180^0-\angle ACM=180^0-\angle ALO=\angle ASO$ , suy ra $SO\parallel MN$ . Cũng có $SN\parallel OM$ do cùng vuông góc $BC$ . Ta được tứ giác $SONM$ là hình bình hành. Kéo theo $SN=OM=NO$ . Tam giác $NSO$ cân tại $N$ . Ta cũng có : $\angle KOS=KAS=\angle LAO=\angle LOK$ (Chú ý $AS,AO$ đẳng giác trong góc $BAC$ ) Suy ra $KL$ song song $SO$ . Dẫn đến $OSKL$ là hình thang cân. Từ đó có ngay : $\angle KSN=360^0-\angle KSO-\angle NSO=360^0-\angle SOL-\angle NOS=\angle LON$ Không khó để thấy được $\Delta KSN=\Delta LON$ . Ta được điều cần chứng minh : $NK=NL$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/25/geometry-49/

---

## 49. (Korean Final Round 2012)

**Đề:** Cho tam giác nhọn $ABC$ , $H$ là chân vuông góc hạ từ $A$ xuống $BC$ . $D,E$ là các điểm trên $AB,AC$ và $F,G$ là các hình chiếu vuông góc của $D,E$ xuống $BC$ . Gỉa sử giao điểm của $DG$ và $EF$ nằm trên $AH$ . Gọi $P$ là chân vuông góc từ $E$ xuống $DH$ . Chứng minh $\angle APE=\angle CPE$ .

<details><summary>Lời giải</summary>

Trước tiên ta sẽ chứng minh $AH,BE,CD$ đồng quy. Gọi $L,M$ theo thứ tự là giao của $(DG,AF),(AG,EF)$ và $N$ là điểm đồng quy của $DG,EF,AH$ . Áp dụng định lí Ceva cho tam giác $AFG$ và sự đồng quy của $FM,GL,AH$ : $\dfrac{LA}{LF}.\dfrac{HF}{HG}.\dfrac{MG}{MA}=1$ Theo định lí Thales : $\dfrac{LA}{LF}=\dfrac{AN}{DF},\dfrac{MG}{MA}=\dfrac{EG}{AN}$ Từ đó ta thu được : $\dfrac{HF}{HG}=\dfrac{DF}{EG}\;\;\;(*)$ Theo định lí Thales, ta có : $\dfrac{BF}{HB}=\dfrac{DF}{AH},\dfrac{GC}{HC}=\dfrac{EG}{AH}\Rightarrow \dfrac{BF.HC}{HB.GC}=\dfrac{DF}{EG}\;\;(**)$ Từ $(*)(**)$ ta được : $\dfrac{BF.HC}{HB.GC}=\dfrac{HF}{HG}\Rightarrow \dfrac{HF}{FB}.\dfrac{HB}{HC}.\dfrac{GC}{HG}=1\Rightarrow \dfrac{DA}{DB}.\dfrac{HB}{HC}.\dfrac{EC}{EA}=1$ Từ đó theo định lí Ceva đảo ta được $AH,BE,CD$ đồng quy. Khi ấy dễ thấy $P(DEAC)=-1$ mà $PE\perp DH$ nên theo định lí về chùm điều hòa ta có $PE$ là phân giác góc $APC$ . Điều phải chứng minh

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/24/geometry-48/

---

## 50. (Korea Final Round 2013)

**Đề:** Cho tam giác $ABC$ có $AC>AB$ , $D$ là điểm trên $AC$ thỏa mãn $\angle ABD=\angle C$ . Gọi $I$ là tâm nội tiếp tam giác $ABC$ và $E$ là giao điểm khác $I$ của đường tròn ngoại tiếp tam giác $CDI$ và $AI$ . Đường thẳng qua $E$ song song $AB$ gặp $BD$ tại $P$ . Gỉa sử $J$ là tâm nội tiếp tam giác $ABD$ và $A'$ là điểm đối xứng của $A$ qua $I$ . $Q$ là giao điểm của $JP$ và $A'C$ . Chứng minh rằng $QJ=QA'$ .

<details><summary>Lời giải</summary>

Gọi $X$ là trung điểm của $BE$ . Ta có : $\angle BPE=\angle ABD=\angle C$ Và $\angle BEP=\angle BEA+\angle AEP=\angle ABI+\angle BAI=\dfrac{\angle A +\angle B}{2}$ (Chú ý vì $AI.AE=AD.AC=AB^2\Rightarrow \angle BEA=\angle ABI$ ) Như vậy $\angle BPE+2\angle BEP=180^0$ , suy ra tam giác $PBE$ cân tại $P$ . Vậy trung tuyến $PX$ cũng sẽ là đường cao. Ta có : $\angle JDE=180^0-\angle DJE-\angle DEJ=180^0-\left ( \angle JAD+\angle JDA \right )-\angle DCI=180^0-\left ( \dfrac{\angle A}{2}+\dfrac{\angle B}{2} \right )-\dfrac{ \angle C}{2}=90^0$ Xét hai tam giác vuông $JDE$ và $EXP$ có $\angle XPE=\angle DEJ=\dfrac{\angle C}{2}$ nên chúng đồng dạng. Suy ra : $\dfrac{EX}{JD}=\dfrac{EP}{JE}$ Dễ thấy hai tam giác $AJD$ và $ABE$ đồng dạng nên : $\dfrac{BE}{JD}=\dfrac{AB}{AJ}=\dfrac{AC}{AI}\Rightarrow \dfrac{EX}{JD}=\dfrac{AC}{AA'}\;\;(BE=2EX,AA'=2AI)$ Do vậy ta được : $\dfrac{AC}{AA'}=\dfrac{EP}{JE}$ Từ đó dễ dàng có hai tam giác $EJP$ và $AA'C$ đồng dạng. Suy ra : $\angle PJE=\angle AA'C\Rightarrow \angle QJA=180^0-\angle PJE=180^0-\angle AA'C=\angle QAJ\Rightarrow QJ=QA'$ Đây là điều cần chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/24/geometry-47/

---

## 51. (Bosnia Herzegovina Team Selection Test 2010)

**Đề:** Tam giác $ABC$ vuông tại $C$ . Các phân giác trong $AM,BN$ cắt đường cao $CH$ tại $P,Q$ . Chứng minh rằng đường thẳng đi qua trung điểm của $QN,PM$ song song với $AB$ .

<details><summary>Lời giải</summary>

Gọi $I$ là tâm nội tiếp tam giác $ABC$ . Gọi $X,Y$ lần lượt là trung điểm của $QN,PM$ . Ta có : $\angle CQN=\angle HQB=\angle HCB+\angle CBQ=\angle BAC+\dfrac{\angle B}{2}=\angle BAC+\angle QBA=\angle QNC$ Như vậy ta được tam giác $CNQ$ cân tại $C$ , do $X$ là trung điểm của $QN$ nên $CX\perp QN$ . Tương tự $CY\perp PM$ . Từ đó dễ thấy tứ giác $CXIY$ nội tiếp. Ta có : $\angle IYX=\angle ICX=\angle ICN-\angle XCN=\dfrac{90^0-\angle HCA}{2}=\dfrac{\angle A}{2}=\angle IAB$ Hai góc này ở vị trí so le trong nên $XY$ song song $AB$ . Điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/24/geometry-46/

---

## 52. (AoPS)

**Đề:** Cho tam giác $ABC$ nội tiếp $(O)$ . Các phân giác trong góc $B,C$ cắt nhau tại $I$ và cắt đường tròn $(O)$ tại $M,N$ . Trên tia đối các tia $BC,CB$ lấy điểm $P,Q$ sao cho $AB=BP,AC=CQ$ . Đường tròn ngoại tiếp các tam giác $NBP,MCQ$ có tâm là $K,L$ . Chứng minh các tia $KB,LC$ cắt nhau tại một điểm thuộc đường tròn $(O)$ .

<details><summary>Lời giải</summary>

Gọi $X$ là giao của $KB,LC$ Ta có $\angle PAN=\angle PAB-\angle NAB=\dfrac{\angle B-\angle C}{2}$ . Tương tự cũng có $\angle QAM=\dfrac{\angle B-\angle C}{2}$ . Như vậy $\angle PAN=\angle QAM\;\;\;\;(1)$ Theo định lí sin trong tam giác $PAB$ : $\dfrac{AP}{sin\angle ABP}=\dfrac{AB}{sin\angle APB}\Rightarrow AP=\dfrac{AB.sinB}{sinB/2}$ Tương tự có $AQ=\dfrac{AC.sinC}{sinC/2}$ . Kéo theo $\dfrac{AP}{AQ}=\dfrac{AB.sinB}{AC.sinC}.\frac{sinC/2}{sinB/2}$ Theo định lí sin trong tam giác $NAB$ : $\dfrac{AN}{sin\angle ABN}=\dfrac{AB}{sin\angle ANB}\Rightarrow AN=\dfrac{AB.sin\angle C/2}{sinC}$ Tương tự có $AM=\dfrac{AC.sin\angle B/2}{sinB}$ . Kéo theo $\dfrac{AN}{AM}=\dfrac{AB.sinC/2}{AC.sinB/2}.\dfrac{sinB}{sinC}$ Từ đó có : $\dfrac{AP}{AQ}=\dfrac{AN}{AM}\;\;\;\;(2)$ Từ $(1)(2)$ suy ra hai tam giác $PAN,AQM$ đồng dạng. Cho ta $\angle ANP=\angle AMQ$ Ta biểu diễn : $\angle XBC+\angle XCB=\angle KBP+\angle LCQ=\dfrac{180^0-\angle BKP}{2}+\dfrac{180^0-\angle CLQ}{2}=180^0-\angle BNP-\angle CMQ=180^0-\left ( 360^0-\angle ANP-\angle ANB \right )-\left ( \angle AMQ-\angle AMC \right )=\angle ANB+\angle +\angle AMC-180^0=(180^0-\angle C)+(180^0-\angle B)-180^0=180^0-\angle B-\angle C=\angle A$ Từ đó mà : $\angle BXC+\angle A=180^0-\angle XBC-\angle XCB+\angle A=180^0$ Vậy tứ giác $ABXC$ nội tiếp hay điểm $X$ thuộc $(O)$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/24/geometry-45/

---

## 53. (AoPS)

**Đề:** Cho tam giác $ABC$ có phân giác $BE,CF$ và $EF$ cắt đường tròn ngoại tiếp $(O)$ tại hai điểm $M,N$ . Gọi $I_a$ là tâm bàng tiếp góc $A$ của tam giác. Chứng minh tam giác $I_aMN$ cân.

<details><summary>Lời giải</summary>

Theo bài toán này thì ta có $OI_a$ vuông góc $EF$ hay $OI_a$ vuông góc $MN$ . Như vậy $OI_a$ cũng sẽ đi qua trung điểm của $MN$ theo tính chất đường kính và dây trong đường tròn. Tam giác $I_aMN$ có $I_aO$ là đường cao đồng thời là trung tuyến nên là tam giác cân.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/23/geometry-44/

---

## 54. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ nội tiếp $(O)$ và ngoại tiếp $(I)$ . $AI,BI,CI$ theo thứ tự cắt $BC,CA,AB$ tại $A_1,B_1,C_1$ và cắt $(O)$ tại $A_2,B_2,C_2$ khác $A,B,C$ . Chứng minh rằng các đường thẳng qua $A_2,B_2,C_2$ lần lượt vuông góc với $B_1C_1,C_1A_1,A_1B_1$ đồng quy tại trung điểm của $OI$ .

<details><summary>Lời giải</summary>

Gọi $X$ là trung điểm của $OI$ . Kí hiệu $d_A,d_B,d_C$ lần lượt là đường thẳng qua $A_2,B_2,C_2$ lần lượt vuông góc với $B_1C_1,C_1A_1,A_1B_1$ . Gọi $I_a,I_b,I_c$ theo thứ tự là tâm bàng tiếp góc $A,B,C$ của tam giác $ABC$ . Khi đó $(O)$ chính là đường tròn Euler của tam giác $I_aI_bI_c$ . Từ đó thấy rằng $A_2,B_2,C_2$ chính là trung điểm của $II_a,II_b,II_c$ . Khi đó trong tam giác $IOI_a$ thì $XA_2$ là đường trung bình nên $XA_2\parallel OI_a$ . Hơn nữa theo bài toán này , ta có $OI_a\perp B_1C_1$ . Như vậy ta có $XA_2\equiv d_A$ . Tương tự $XB_2\equiv d_B,XC_2\equiv d_C$ . Dễ thấy có điều phải chứng minh. Ta phát biểu tổng quát hơn cho bài toán này : Cho tam giác $ABC$ nội tiếp $(O)$ , phân giác $AD,BE,CF$ đồng quy tại $I$ . $AI,BI,CI$ theo thứ tự cắt $(O)$ tại $X,Y,Z$ khác $A,B,C$ . Gọi $K,L,N$ là các điểm lần lượt chia $IX,IY,IZ$ theo cùng một tỉ số. Chứng minh các đường thẳng qua $K,L,N$ theo thứ tự vuông góc với $EF,FD,DE$ đồng quy. Chứng minh hoàn toàn tương tự bài trên. Ta đổi cách phát biểu bài toán : Cho tam giác $ABC$ nội tiếp $(O)$ cố định với $B,C$ cố định và $A$ di chuyển trên cung lớn. Phân giác $BE,CF$ cắt nhau tại $I$ . Điểm $J$ trên $OI$ chia $OI$ theo tỉ số $k$ cố định. Chứng minh rằng đường thẳng qua $J$ vuông góc với $EF$ luôn đi qua một điểm cố định. Lời giải : Đường thẳng qua $J$ vuông góc $EF$ cắt $II_a$ và trung trực $BC$ tại $M,K$ . Trung trực $BC$ cắt cung $BC$ không chứa $A$ tại $L$ . Dễ thấy $L$ là trung điểm của $II_a$ . Theo cách giải các bài toán trên ta sẽ có $JM$ song song $OI_a$ và từ đó : $\dfrac{IM}{MI_a}=k\Rightarrow \dfrac{ML}{MI_a}=\dfrac{MI_a-LI_a}{MI_a}=k\Rightarrow \dfrac{KL}{KO}=\dfrac{LI_a}{MI_a}=1-k$ Dễ dàng thấy $L$ cố định và $O$ cố định. Do vậy $K$ chính là điểm cố định mà đường thẳng qua $J$ vuông góc $EF$ luôn đi qua. Một cách nhìn khác nữa cho bài toán trên : Cho tam giác $ABC$ nội tiếp $(O)$ cố định với $B,C$ cố định và $A$ di chuyển trên cung lớn. Phân giác $BE,CF$ cắt nhau tại $I$ và $J$ là điểm trên đường thẳng $IA$ sao cho $IJ=k$ không đổi. Chứng minh đường thẳng qua $J$ vuông góc $EF$ luôn đi qua điểm cố định Lời giải : Ta có $II_a=\dfrac{BI}{sin\angle II_aB}=\dfrac{BI}{sin\angle ICB}=\dfrac{BC}{sin\angle BIC}=const$ . Ta lại có : $\dfrac{LK}{LO}=\dfrac{JL}{KL_a}=\frac{IL-IJ}{KL_a}=1-\dfrac{2k}{II_a}=const$ Như vậy điểm $K$ là điểm cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/23/geometry-43/

---

## 55. (Tạp chí Toán học và Tuổi trẻ số 424 &#8211; Trần Quang Hùng)

**Đề:** Cho tam giác $ABC$ , tâm ngoại tiếp $(O)$ , tâm nội tiếp $(I)$ và tâm bàng tiếp góc $A$ là $I_a$ . $AI,BI$ cắt $BC,CA$ tại $D,E$ . Đường thẳng qua $I$ vuông góc $OI_a$ cắt $AC$ tại $M$ . Chứng minh rằng $DE$ đi qua trung điểm của $IM$ .

<details><summary>Lời giải</summary>

Bổ đề : Cho tam giác $ABC$ phân giác $BE,CF$ có tâm $O$ ngoại tiếp và tâm $I_a$ bàng tiếp góc $A$ . Khi đó thì $EF$ vuông góc $OI_a$ . Xem chứng minh tại đây Trở lại bài toán : Gọi $F$ là giao của $CI$ với $latex AB$. Theo bổ đề ta có $EF$ vuông góc $OI_a$ . Suy ra $IM$ song song $EF$ . Mặt khác cũng dễ dàng thấy $E(FDIM)=-1$ (hàng điều hòa tứ giác toàn phần). Vậy theo định lí về chùm điều hòa ta có $ED$ đi qua trung điểm của $IM$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/23/geometry-42/

---

## 56. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ phân giác $BE,CF$ , tâm ngoại tiếp $(O)$ , tâm đường tròn bàng tiếp góc $A$ là $I_a$ . Chứng minh rằng $OI_a$ vuông góc $EF$ .

<details><summary>Lời giải</summary>

Gọi $I_b,I_c$ theo thứ tự là tâm bàng tiếp góc $B,C$ của tam giác $ABC$ . Khi đó dễ dàng nhận thấy $I$ là trực tâm tam giác $I_aI_bI_c$ , $A,B,C$ theo thứ tự là chân ba đường cao của tam giác $I_aI_bI_c$ và $O$ là tâm Euler của tam giác $I_aI_bI_c$ . Khi đó theo bài toán này ta có ngay $EF$ vuông góc với $OI_a$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/23/geometry-41/

---

## 57. (Vietnam Mathematical Olympiad 2007)

**Đề:** Cho hình thang $ABCD$ nội tiếp $(O)$ có đáy lớn $BC$ . $P$ là một điểm thuộc đường thẳng $BC$ sao cho $PA$ không tiếp xúc với $(O)$ . Đường tròn đường kính $DP$ cắt $(O)$ tại $E$ khác $D$ . $PA$ cắt $(O)$ tại $N$ . $DE$ giao $BC$ tại $M$ . Chứng minh rằng khi $P$ thay đổi thì $MN$ luôn đi qua một điểm cố định.

<details><summary>Lời giải</summary>

Gọi giao của đường tròn đường kính $DP$ với $BC$ là $K$ . Giao của $DK$ với $(O)$ là $I$ . Dễ thấy $DI\perp BC$ . Ta sẽ chứng minh $NI,BC,DE$ đồng quy. Gỉa sử $NI$ cắt $BC$ tại $M'$ .Ta có : $\angle INP=\angle IKP=90^0$ Nên bốn điểm $N,I,K,P$ đồng viên. Suy ra : $M'N.M'I=M'K.M'P\Rightarrow P_{M'/(O)}=P_{M'/(DP)}$ Do đó $M'$ thuộc trục đẳng phương của hai đường tròn, tức $M'$ thuộc $DE$ hay $M'$ trùng $M$ . Như vậy ta có ngay $MN$ luôn đi qua điểm $I$ cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/19/geometry-40/

---

## 58. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ cố định nội tiếp $(O)$ . Gọi $H$ là trực tâm tam giác, $P$ là một điểm di chuyển trên đường tròn ngoại tiếp tam giác $BHC$ . $PB$ cắt đường thẳng qua $C$ vuông góc $AC$ tại $E$ . $PC$ cắt đường thẳng qua $B$ vuông góc $AB$ tại $F$ . Chứng minh rằng : Trung điểm của $EF$ luôn thuộc một đường thẳng cố định.

<details><summary>Lời giải</summary>

Bổ đề : Cho tam giác $ABC$ nội tiếp $(O)$ . Đường cao $BE,CF$ . $P$ là một điểm thuộc $(O)$ . $PB,PC$ theo thứ tự cắt $CF,BE$ tại $M,N$ . Khi đó ta có $EF$ chia đôi $MN$ . Chứng minh bổ đề : Gọi $J$ là giao của $EF,MN$ và $H$ là trực tâm tam giác. Theo định lí Menelaus cho tam giác $MNH$ và đường thẳng $FJE$ : $\dfrac{JM}{JN}.\dfrac{EN}{EH}.\dfrac{FH}{FM}=1$ Dễ thấy hai tam giác $MFB$ và $NEC$ đồng dạng nên : $\dfrac{EN}{MF}=\dfrac{EC}{FB}=\dfrac{EH}{FH}$ Kết hợp cả hai điều trên ta được $JM=JN$ . Bổ đề được chứng minh. Trở lại bài toán : Gọi $K$ là giao điểm của đường thẳng qua $B$ vuông góc $AB$ và đường thẳng qua $C$ vuông góc $AC$ . Dễ thấy điểm $K$ thuộc $(O)$ . Gọi $S$ là điểm đối xứng với $A$ qua trung điểm $BC$ . Ta thấy hai tam giác $ABC$ và $SCB$ đối xứng nhau qua trung điểm $BC$ . Cũng dễ thấy $H,K$ đối xứng nhau qua trung điểm của $BC$ . Ta suy ra được $K$ là trực tâm tam giác $SBC$ . Lần lượt gọi $X,Y$ là giao điểm của $(BK,SC),(CK,BS)$ . Ta được tam giác $SBC$ nội tiếp $(BHC)$ có hai đường cao $BY,CX$ . Sử dụng bổ đề trên ta được $XY$ chia đôi $EF$ . Tức là trung điểm của $EF$ luôn thuộc đường thẳng $XY$ , dễ thấy đây là một đường thẳng cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/19/geometry-39/

---

## 59. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ nội tiếp $(O)$ cố định và $BC$ cố định, $A$ di chuyển trên $(O)$ . Gọi $m$ là đường thẳng đối xứng với đường thẳng $AB$ qua $AC$ , $n$ là đường thẳng đối xứng với đường thẳng $AC$ qua $AB$ . Gọi $E,F$ theo thứ tự là hình chiếu của $C,B$ lên $m,n$ . Chứng minh rằng đường thẳng $(d)$ qua $A$ vuông góc với $EF$ luôn đi qua một điểm cố định.

<details><summary>Lời giải</summary>

Gọi $M,N$ theo thứ tự là điểm đối xứng với $B,C$ qua $AC,AB$ . Dễ thấy $M$ thuộc $m$ và $N$ thuộc $n$ . Gọi $I,J$ theo thứ tự là trung điểm của $CN,BM$ . Chú ý các bộ điểm đồng viên $(F,I,B,N),(I,J,C,B),(J,E,M,C)$ nên có : $AF.AN=AI.AB=AJ.AC=AE.AM$ Từ đây suy ra tứ giác $EFNM$ nội tiếp. Do đó đường thẳng $(d)$ qua $A$ vuông góc $EF$ sẽ đi qua tâm ngoại tiếp tam giác $AMN$ . Sử dụng bài toán này , ta được $(d)$ đi qua điểm $O'$ đối xứng với $O$ qua $BC$ , là một điểm cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/17/geometry-38/

---

## 60. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ nội tiếp $(O)$ cố định với $BC$ cố định và $A$ di động trên $(O)$ . $E,F$ lần lượt đối xứng với $B,C$ qua $CA,AB$ . Gọi $K$ là tâm ngoại tiếp tam giác $AEF$ . a) Gọi $N$ là tâm Euler của tam giác $ABC$ . Chứng minh rằng $K,A,N$ thẳng hàng. b) Chứng minh khi $A$ di động thì $KA$ luôn đi qua một điểm cố định.

<details><summary>Lời giải</summary>

a) Kẻ $AL$ vuông góc với $EF$ thì $AL,AK$ đẳng giác trong góc $EAF$ . Từ đó suy ra : $\angle KAF=\angle LAE\Rightarrow 180^0-\angle KAF=180^0-\angle LAE\Rightarrow \angle FAy=\angle EAx\Rightarrow \angle EAB+\angle BAx=\angle FAC+\angle CAy$ Trong đó $Ax,Ay$ theo thứ tự là tia đối của hai tia $AL,AK$ Hơn nữa cũng dễ dàng thấy rằng $\angle EAB=BAC=\angle FAC$ nên phải có $\angle BAx=\angle CAy$ . Điều này chứng tỏ $Ax,Ay$ hay $AK,AL$ là cặp đường đẳng giác trong góc $BAC$ . Mặt khác theo bài toán này thì $AL$ đẳng giác với $AN$ trong góc $BAC$ . Vậy ta có $AN$ trùng $AK$ hay $K,A,N$ thẳng hàng. b) Gọi $O'$ là điểm đối xứng với $O$ qua $BC$ . Dễ chứng minh $A,N,O'$ thẳng hàng bằng cách chỉ ra tứ giác $AHO'O$ là hình bình hành. Áp dụng kết quả câu a ta được $K,A,O'$ thẳng hàng hay $AK$ luôn đi qua $O'$ là một điểm cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/17/geometry-37/

---

## 61. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ nội tiếp $(O)$ với $BC$ cố định, $A$ di chuyển trên $(O)$ . $E,F$ lần lượt đối xứng với $B,C$ qua $CA,AB$ . Chứng minh rằng đường thẳng $(d)$ qua $A$ vuông góc với $EF$ luôn đi qua một điểm cố định khi $A$ di chuyển.

<details><summary>Lời giải</summary>

Gọi $N$ là tâm Euler của tam giác $ABC$ và $Y,Z$ là hình chiếu của $N$ trên $AB,AC$ . $G$ là trọng tâm tam giác. Theo bài toán này , ta được $(N,Y,F),(N,Z,E)$ là các bộ ba điểm thẳng hàng. Và cũng có : $\dfrac{NY}{NF}=\dfrac{NZ}{NE}=\dfrac{1}{4}$ Từ đó suy ra $YZ$ song song $EF$ . Vậy $(d)$ vuông góc $YZ$ . Gọi $I$ là giao của $(d)$ và $YZ$ . Vì bốn điểm $N,Y,A,Z$ đồng viên nên : $\angle NAZ=\angle NYZ=90^0-\angle AYI=\angle IAY$ Như vậy $AI,AN$ đẳng giác trong góc $BAC$ . Theo bài toán này ta suy ra $AI$ đi qua tâm ngoại tiếp tam giác $BOC$ , là một điểm cố định. Vậy $(d)$ luôn đi qua một điểm cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/17/geometry-36/

---

## 62. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ nội tiếp đường tròn $(O)$ với trực tâm $H$ , trọng tâm $G$ và tâm Euler $N$ . Gọi $D$ là điểm đối xứng của $A$ qua $BC$ . Chứng minh rằng đường thẳng $GD$ luôn đi qua chân vuông vuông góc hạ từ $N$ xuống $BC$ .

<details><summary>Lời giải</summary>

Gọi $M$ là trung điểm của $BC$ và $J$ là chân đường cao hạ từ $A$ . Gọi $X$ là giao điểm của $GD$ và $BC$ . Ta có : $2NX=HJ+OM=HJ+\dfrac{1}{2}AH=\dfrac{2HJ+AH}{2}=\dfrac{AJ+HJ}{2}=\dfrac{JD+HJ}{2}=\dfrac{HD}{2}\Rightarrow NX=\dfrac{1}{4}HD$ Hơn nữa lại có : $\dfrac{GN}{GH}=\dfrac{ON-OG}{GH}=\dfrac{1/2.OH-1/3.OH}{2/3.OH}=\dfrac{1}{4}$ Từ đó suy ra $NX$ song song $AD$ , lại có thêm $AD$ vuông góc $BC$ nên suy ra $NX$ vuông góc $BC$ . Ta được điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/17/geometry-35/

---

## 63. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ . Một đường thẳng $(d)$ thay đổi nhưng song song $BC$ cắt $AB,AC$ theo thứ tự tại $M,N$ . Gọi $I$ là giao của $BN,CM$ . Đường tròn ngoại tiếp các tam giác $BIM,CIN$ cắt nhau tại điểm thứ hai là $P$ . Chứng minh khi $(d)$ thay đổi, điểm $P$ luôn thuộc một đường thẳng cố định.

<details><summary>Lời giải</summary>

Qua $N$ kẻ đường thẳng song song $MC$ cắt $AI$ tại $G$ . Chú ý : $\dfrac{AN}{AC}=\dfrac{AG}{AI}=\dfrac{AM}{AB}$ Nên cũng suy ra $MG\parallel IN$ . Từ đó dễ thấy tứ giác $GMIN$ là hình bình hành. Dẫn đến $AI$ đi qua trung điểm của $MN$ . Lại do $MN\parallel BC$ nên $AI$ là trung tuyến của tam giác $ABC$ . Chú ý các tứ giác $IMBP,INCP$ nội tiếp : $\angle PMB=\angle PIB=\angle NCP$ Như vậy ta được tứ giác $AMPC$ nội tiếp. Kéo theo : $\angle PAC=\angle PMC=\angle PBI$ Khi đó dễ thấy hai tam giác $PBI$ và $PAC$ đồng dạng vì : $\angle PBI=\angle PAC,\angle IPB=\angle IMA=\angle APC$ Dẫn đến : $\dfrac{AC}{IB}=\dfrac{PC}{IP}$ Cũng dễ thấy : $\dfrac{AN}{AC}=\dfrac{MN}{BC}=\dfrac{IN}{IB}\Rightarrow \dfrac{AN}{IN}=\dfrac{AC}{IB}$ Từ hai điều trên ta thu được : $\dfrac{PC}{IP}=\dfrac{AN}{IN}$ Kết hợp với $\angle ANI=\angle IPC$ , ta suy ra được hai tam giác $AIN,CIP$ đồng dạng. Suy ra : $\angle IAC=\angle ICP=\angle PAB$ Điều này chứng tỏ rằng $AI,AP$ đẳng giác trong góc $A$ . Hơn nữa ta đã chứng minh được $AI$ là trung tuyến trong tam giác $ABC$ nên $AP$ là đường đối trung của tam giác $ABC$ . Vậy $P$ luôn thuộc đường đối trung của tam giác $ABC$ , là một đường thẳng cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/17/geometry-33/

---

## 64. (không rõ nguồn thi)

**Đề:** Một điểm $B$ thay đổi trên dây $AC$ của đường tròn $(\omega)$ . Đường tròn đường kính $AB,BC$ có tâm $O_1,O_2$ cắt $(\omega)$ tại $D,E$ . Tia $O_1D$ và $O_2E$ cắt nhau tại $F$ . Tia $AD,CE$ cắt nhau tại $G$ . Chứng minh $FG$ đi qua trung điểm của $AC$ .

<details><summary>Lời giải</summary>

Gọi $S$ là giao điểm của $FG$ với $AC$ . Áp dụng định lí Menelaus cho tam giác $FSO_2$ và đường thẳng $GEC$ : $\dfrac{EF}{EO_2}.\dfrac{CO_2}{CS}.\dfrac{GS}{GF}=1\Rightarrow CS=\dfrac{EF.GS}{GF}\;\;\;\;(EO_2=CO_2)\;\;\;\;\;(1)$ Tương tự ta được : $AS=\dfrac{DF.GS}{GF}\;\;\;\;(2)$ Chú ý bốn điểm $A,D,E,C$ đồng viên nên : $\angle GDE=\angle ECO_2=\angle O_2EC=\angle GEF,\angle GED=\angle DAO_1=\angle O_1DA=\angle GDF$ Suy ra : $\angle EDF=\angle GDE+\angle GDF=\angle GED+\angle GEF=\angle DEF$ Vậy ta được tam giác $EFD$ cân tại $F$ , kéo theo $FE=FD (3)$ Từ $(1)(2)(3)$ suy ra $SA=SC$ tức $S$ là trung điểm của $AC$ . Điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/17/geometry-32/

---

## 65. (IMO Shortlist 2011)

**Đề:** Cho tứ giác lồi $ABCD$ với $AD$ không song song $BC$ . Các đường tròn đường kính $AB,CD$ cắt nhau tại $E,F$ nằm trong tứ giác. Gọi $\omega _E, \omega _F$ lần lượt là đường tròn đi qua các hình chiếu của $E$ trên $AB,BC,CD$ , của $F$ trên $CD,DA,AB$ . Chứng minh rằng hai giao điểm của $\omega _E, \omega _F$ cùng với trung điểm của $EF$ cùng nằm trên một đường thẳng.

<details><summary>Lời giải</summary>

Gọi $R,S,T$ là chân vuông góc của $E$ xuống $AB,BC,CD$ , $R',S',T'$ là chân vuông góc của $F$ xuống $AB,AD,DC$ . Gọi $M$ là trung điểm của $AB$ và $G$ là trung điểm của $AF$ . Gọi giao của $RG$ với $\omega _E$ là $U$ . Dễ thấy tứ giác $ERMG$ nội tiếp do có hai góc đối $R,G$ đều vuông, kéo theo $\angle RGE=\angle RME=2 \angle MBE=2\angle RSE$ Gọi $X$ là trung điểm của $CD$ , dễ có : $\angle EGT=\angle EXT=\angle XEC+\angle XCE=2\angle XCE=2\angle \angle EST$ Từ đó suy ra : $\angle RGT=2\left ( \angle RSE+\angle EST \right )=2\angle RST=2\angle RUT=2\angle GUT$ Điều này chứng tỏ rằng tam giác $GTU$ cân tại $G$ , suy ra $GT=GU$ . Do đó ta được : $P_{G/(\omega_E)}=RG.GU=RG.GT$ Tương tự $P_{G/(\omega_F)}=R'G.T'G$ . Cũng dễ dàng chứng minh $RG=R'G,TG=T'G$ . Như vậy $P_{G/(\omega_E)}=P_{G/(\omega_F)}$ Điều này cho thấy $G$ nằm trên trục đẳng phương của hai đường tròn. Ta có điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/16/geometry-31/

---

## 66. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ có các phân giác trong $AM,BN,CP$ thỏa mãn $MN$ vuông góc $MP$ . Tính góc $BAC$ .

<details><summary>Lời giải</summary>

Gọi $G$ là giao của $PN$ và $BC$ . Do $AM,BN,CP$ đồng quy tại tâm nội tiếp tam giác nên $(GMBC)=-1$ (hàng điều hòa tứ giác toàn phần) Hơn nữa do $MN$ vuông góc $MP$ nên theo định lí về chùm điều hòa ta có $MP$ là phân giác góc $AMB$ . Theo tính chất phân giác : $\dfrac{AP}{PB}=\dfrac{AM}{MB}=\dfrac{sin\angle B}{sin\dfrac{\angle A}{2}},\dfrac{AP}{PB}=\dfrac{AC}{BC}=\dfrac{sin\angle B}{sin\angle A}$ Từ đó suy ra : $sin\angle A=sin\dfrac{\angle A}{2}\Rightarrow \angle BAC=120^0$

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/16/geometry-30/

---

## 67. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ nhọn khác tam giác cân. $M$ là trung điểm của $BC$ . $D$ và $E$ là các điểm thuộc $AM$ sao cho $AD=BD$ và $AE=EC$ . $DB$ cắt $CE$ tại $F$ . Một đường tròn qua $B,C$ cắt các cạnh $AB,AC$ lần lượt ở $H,K$ . Chứng minh rằng $AF$ đi qua trung điểm của $HK$ .

<details><summary>Lời giải</summary>

Theo định lí sin trong các tam giác $FAB,FAC$ : $\dfrac{AB}{sin\angle AFB}=\dfrac{FA}{sin\angle ABD}=\dfrac{FA}{sin\angle BAM},\dfrac{AC}{sin\angle AFC}=\dfrac{FA}{sin\angle ACE}=\dfrac{FA}{sin\angle CAM}$ Ta suy ra : $\dfrac{sin\angle AFB}{sin\angle AFC}=\dfrac{AB}{AC}.\dfrac{sin\angle BAM}{sin\angle CAM}$ Lại theo định lí sin trong tam giác $BAM,CAM$ : $\dfrac{AB}{BM}=\dfrac{sin\angle AMB}{sin\angle BAM},\dfrac{AC}{MC}=\dfrac{sin\angle AMC}{sin\angle CAM}\Rightarrow \dfrac{AB}{AC}=\frac{sin\angle CAM}{sin\angle BAM}\;\;\;(BM=MC,\angle AMB+\angle AMC=180^0)$ Từ hai điều trên suy ra : $sin\angle AFB=sin\angle AFC\Rightarrow \angle AFB=\angle AFC$ Theo tính chất góc ngoài tam giác : $360^0-2\angle AFB=\angle BFC=\angle FDE+\angle FED=2\angle BAD+2\angle DAC=2\angle BAC\Rightarrow 180^0-\angle AFB=\angle BAC\Rightarrow \angle FAB+\angle FBA=\angle FAB+\angle FAC\Rightarrow \angle FBA=\angle FAC\Rightarrow \angle BAD=\angle FAC$ Từ đây có ngay $AM,AF$ đẳng giác trong góc $A$ . Hơn nữa dó $HK,BC$ đối song nên trung tuyến $d$ qua $A$ của tam giác $AHK$ sẽ đẳng giác với trung tuyến $AM$ của tam giác $ABC$ . Từ hai điều trên có ngay $AF$ trùng $d$ , tức $AF$ là trung tuyến của tam giác $AHK$ . Vậy $AF$ đi qua trung điểm của $HK$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/15/geometry-29/

---

## 68. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ . Một đường tròn thay đổi qua $B,C$ cắt $AB,AC$ theo thứ tự tại $D,E$ . Tiếp tuyến tại $D,E$ của đường tròn ngoại tiếp tam giác $ADE$ cắt nhau tại $P$ . Chứng minh rằng khi đường tròn qua $B,C$ thay đổi, điểm $P$ luôn thuộc một đường thẳng cố định.

<details><summary>Lời giải</summary>

Gọi $M,N$ theo thứ tự là trung điểm của $BC,DE$ . Ta có $DE,BC$ là hai đường đối song nên trung tuyến $AN$ của tam giác $ADE$ sẽ đẳng giác với trung tuyến $AM$ của tam giác $ABC$ trong góc $A$ . Hơn nữa $P$ là giao hai tiếp tuyến tại $D,E$ của đường tròn $(ADE)$ nên $AP$ là đường đối trung của tam giác $ADE$ , suy ra $AP$ đẳng giác với trung tuyến $AN$ . Từ hai điều trên suy ra $AP$ trùng $AM$ . Tức $P$ luôn thuộc trung tuyến $AM$ cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/15/geometry-28/

---

## 69. (không rõ nguồn thi)

**Đề:** Đường tròn nội tiếp tam giác $ABC$ tiếp xúc các cạnh $AB,BC,CA$ tại $C_1,A_1,B_1$ . Các điểm $A_2,B_2$ lần lượt là trung điểm của $B_1C_1,C_1A_1$ . Gọi $P$ là giao của đường tròn nội tiếp tam giác $ABC$ với $OC$ , $O$ là tâm ngoại tiếp tam giác $ABC$ . Gọi $N,M$ theo thứ tự là giao của $PA_2,PB_2$ với đường tròn nội tiếp tam giác $ABC$ . Chứng minh rằng giao điểm của $AN$ và $BM$ thuộc đường cao hạ từ $C$ của tam giác $ABC$ .

<details><summary>Lời giải</summary>

Gọi $S$ là giao của $AN$ và $BM$ . Muốn chứng minh $CS$ là đường cao của tam giác thì ta chỉ cần chứng minh $CS$ và $CO$ là hai đường đẳng giác trong góc $C$ . Ta lần lượt chứng minh $(AS,AP),(BS,BP)$ là các cặp đường đẳng giác tương ứng trong góc $A,B$ . Gọi $I$ là tâm nội tiếp tam giác $ABC$ . Nhận thấy rằng $A_2I.A_2A=A_2C_1.A_2B_1=A_2N.A_2P$ . Do đó bốn điểm $A,N,I,P$ đồng viên. Chú ý tam giác $NIP$ cân tại $I$ ta thu được : $\angle NAI=\angle NPI=\angle INP=\angle IAP$ Vậy nên $AN,AP$ là hai đường đẳng giác trong góc $A$ . Tương tự $BM,BP$ là hai đường đẳng giác trong góc $B$ . Hơn nữa ta có $AP,BP,CP$ đồng quy tại $P$ . $AN,BM,CS$ đồng quy tại $S$ . Và $(AN,AP),(BM,BP)$ là các cặp đường đẳng giác. Suy ra $CP,CS$ cũng là hai đường đẳng giác. Mà $CP$ đi qua tâm ngoại tiếp $O$ nên $CS$ chính là đường cao của tam giác $ABC$ hạ từ $C$ . Ta có điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/15/geometry-27/

---

## 70. (Chọn học sinh giỏi THPT Chuyên Khoa học Tự nhiên ĐHQGHN 2011-2012)

**Đề:** Tam giác $ABC$ không cân nội tiếp $(O)$ . $P$ là điểm bất kỳ trong tam giác $ABC$ và không trùng $O$ . $AP$ cắt $(O)$ tại $D$ . $DE,AF$ là đường kính của $(O)$ . $EP,FP$ lần lượt cắt $(O)$ tại $G,H$ . Gọi $K$ là giao của $AH,GD$ . $L$ là hình chiếu của $K$ trên $OP$ . a) Chứng minh bốn điểm $A,L,K,D$ cùng thuộc một đường tròn. Gọi đường tròn này là $(S)$ . b) Chứng minh $OP,EF$ cắt nhau tại một điểm thuộc $(S)$ .

<details><summary>Lời giải</summary>

a) Dễ thấy năm điểm $H,P,G,L,K$ cùng thuộc đường tròn đường kính $PK$ . Theo định lí sin trong tam giác $LHG$ : $\dfrac{HL}{sin\angle HGL}=\dfrac{LG}{sin\angle LHG}\Rightarrow \dfrac{HL}{LG}=\dfrac{sin\angle HGL}{sin\angle LHG}=\dfrac{sin\angle HPL}{sin\angle LPG}=\dfrac{sin\angle OPF }{sin\angle OPE}$ Theo định lí sin trong hai tam giác $OPE,OPF$ : $\dfrac{OP}{sin\angle OEP}=\frac{OE}{sin\angle OPE},\dfrac{OP}{sin\angle OFP}=\dfrac{OF}{sin\angle OPF}\Rightarrow \dfrac{sin\angle OPF}{sin\angle OPE}=\dfrac{sin\angle OFP}{sin\angle OEP}$ Chú ý nếu gọi $R$ là bán kính của $(O)$ , theo định lí sin trong các tam giác $EGD,AHF$ : $\dfrac{HA}{GD}=\dfrac{2R.sin\angle OFP}{2R.sin\angle OEP}=\dfrac{sin\angle OFP}{sin\angle OEP}$ Từ các ý trên, ta suy ra : $\dfrac{HL}{GL}=\dfrac{HA}{GD}\;\;\;\;\;(1)$ Do bốn điểm $H,G,L,K$ đồng viên nên : $\angle KHL=\angle KGL\Rightarrow \angle AHL=180^0-\angle KHL=180^0-\angle KGL=\angle DGL\;\;\;\;\;(2)$ Từ $(1)(2)$ ta được hai tam giác $AHL,DGL$ đồng dạng. Kéo theo : $\angle HAL=\angle GDL$ Vậy bốn điểm $A,K,L,D$ đồng viên. b) Dễ thấy $\angle GLP=\angle GHP=\angle GET$ nên bốn điểm $G,L,E,T$ đồng viên. Do đó mà : $PL.PT=PG.PE$ Hơn nữa có $PG.PE=PA.PD$ do bốn điểm $A,E,G,D$ cùng thuộc $(O)$ . Suy ra $PL.PT=PA.PD$ . Hay $ATDL$ nội tiếp, tức là $T$ thuộc đường tròn ngoại tiếp tứ giác $ADKL$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/14/geometry-26/

---

## 71. (không rõ nguồn thi)

**Đề:** Cho ba điểm $A,B,C$ thẳng hàng theo thứ tự đó. Hai đường thẳng $d$ và $\Delta$ theo thứ tự qua $A,C$ và vuông góc với $AC$ . $M$ là điểm bất kì trên $\Delta$ . Vẽ các tiếp tuyến $MD,ME$ đến đường tròn đường kính $AB$ với $D,E$ là hai tiếp điểm. $MD,ME$ cắt $d$ tại $P,Q$ . $BD,BE$ cắt $d$ tại $R,S$ . a) Chứng minh rằng đường tròn ngoại tiếp tam giác $BRS$ luôn đi qua hai điểm cố định. b) Tìm vị trí điểm $M$ để chu vi tam giác $MPQ$ nhỏ nhất.

<details><summary>Lời giải</summary>

a) Gọi $T$ là giao của $(BRS)$ với $AC$ . Ta chứng minh điểm $T$ này cố định. Gọi $K$ là giao của $DE,AB$ . Thực vậy, dễ thấy rằng $AD\perp RB$ . Trong tam giác vuông $ARB$ và có đường cao $AD$ ta có $\angle DAB=\angle ARB$ Do tứ giác $BRTS$ nội tiếp nên $\angle ARB=\angle BTS$ và có $\angle DAB=\angle DEB$ . Kéo theo : $\angle DEB=\angle BTS$ Vậy nên tứ giác $KEST$ nội tiếp. Do vậy $BK.BT=BE.BS=AB^2\;\;\;\;(1)$ Gọi $X$ là giao điểm của $OM$ và $DE$ . Dễ thấy $OM,DE$ vuông góc nhau tại $X$ . Từ đó có $OK.OC=OX.OM=OD^2=AB^2/4$ , đẳng thức này cho ta điểm $K$ cố định. Kết hợp với $(1)$ suy ra $T$ cố định. Mà $(BRS)$ hiển nhiên đi qua $B$ cố định. Do vậy nó đi qua hai điểm cố định. b) Theo tính chất tiếp tuyến ta có $PD=PA$ , hơn nữa tam giác $RDA$ vuông tại $D$ . Ta suy ra được $P$ là trung điểm của $RA$ . Tương tự thì $Q$ là trung điểm của $SA$ . Ta có : $p_{MPQ}=\dfrac{S_{MPQ}}{r_{MPQ}}=\dfrac{S_{MPQ}}{AB^2/4}$ . Do đó để $p_{MPQ}$ nhỏ nhất thì $S_{MPQ}$ nhỏ nhất. Do khoảng cách từ $M$ đến $PQ$ không đổi nên chỉ cần độ dài đoạn $PQ$ là nhỏ nhất. Ta lại có : $PQ=AP+AQ\geq 2\sqrt{AP.AQ}=2\sqrt{\dfrac{AR.AS}{4}}=\sqrt{AB.AT}=const$ Và đẳng thức xảy ra khi $AP=AQ$ . Khi đó do hai tam giác $MPQ,MDE$ cùng cân nên $DE\parallel d\parallel \Delta$ . Kéo theo $M$ thuộc $AC$ hay $M$ trùng $C$ . Vậy để chu vi tam giác $MPQ$ nhỏ nhất thì $M$ trùng $C$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/11/geometry-25/

---

## 72. (Moldova Team Selection Test 2014)

**Đề:** Cho tam giác $ABC$ nhọn có phân giác trong $AD$ . $E,F$ là hình chiếu của $D$ trên $AB,AC$ . $BF,CE$ giao nhau tại $K$ . Đường tròn ngoại tiếp tam giác $AKE$ cắt $BF$ tại $L$ . Chứng minh rằng $DL$ vuông góc $BF$ .

<details><summary>Lời giải</summary>

Kẻ đường cao $AH$ . Ta chứng minh $AH,BF,CE$ đồng quy. Thật vậy, ta có : $\dfrac{BE}{AE}.\dfrac{FA}{FC}.\dfrac{HC}{HB}=\dfrac{ED.cotB}{ED.tan\angle EDA}.\dfrac{DF.tan\angle ADF}{DF.cotC}.\dfrac{cotC.HA}{cotB.HA}=1$ Do đó theo định lí Menelaus đảo, ta có $AH,BF,CE$ đồng quy. Từ đó $A,H,K$ thẳng hàng. Gọi $L'$ là chân vuông góc hạ từ $D$ xuống $BF$ . Chú ý các tứ giác $DL'KH,BEL'D$ nội tiếp, dẫn đến : $\angle AKL'=\angle L'DB=\angle AEL'$ Suy ra bốn điểm $A,E,K,L'$ đồng viên. Từ đó có $L$ trùng $L'$ . Ta có điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/11/geometry-24/

---

## 73. (Kiểm tra đội tuyển THPT Chuyên Hà Tĩnh 2013-2014)

**Đề:** Cho tam giác đều $ABC$ và điểm $D$ di động trên đoạn thẳng $BC$ . Gọi $I$ là tâm đường tròn bàng tiếp trong góc $D$ của tam giác $ABD$ và $J$ là tâm đường tròn bàng tiếp góc $D$ của tam giác $ACD$ . Gọi tâm đường tròn ngoại tiếp tam giác $AIB$ và $AJC$ lần lượt là $O_1$ và $O_2$ a) Chứng minh rằng đường tròn đường kính $O_1O_2$ đi qua $D$ . b) Gọi $F$ là tâm đường tròn ngoại tiếp $AIJ$ và $E$ là giao điểm khác $A$ của $(O_1)$ và $(O_2)$ . Đường thẳng qua $A$ vuông góc với $EF$ cắt $EI,EJ$ lần lượt tại $P,Q$ . Chứng minh $\dfrac{AI^{2}}{AJ^{2}}=\dfrac{IP}{JQ}$

<details><summary>Lời giải</summary>

Bổ đề : Cho tam giác $ABC$ ngoại tiếp $(I)$ . Đường thẳng vuông góc với $AI$ tại $I$ cắt hai cạnh $AB,AC$ tại $P,Q$ . Khi đó ta có : $\dfrac{IB^2}{IC^2}=\dfrac{PB}{QC}$ Chứng minh bổ đề : Ta có : $\angle PIB=\angle APQ-\angle ABI=90^0-\dfrac{\angle A}{2}-\dfrac{\angle B}{2}=\dfrac{\angle C}{2}=\angle QCI$ Tương tự thì $\angle PBI=\angle QIC$ . Từ đó dẫn đến hai tam giác $BPI,IQC$ đồng dạng, kéo theo : $\dfrac{PB}{IQ}=\dfrac{PI}{QC}\Rightarrow PB.QC=PI^2=IQ^2$ Cũng từ hai tam giác này đồng dạng mà : $\dfrac{BI^2}{CI^2}=\dfrac{PB^2}{IQ^2}=\dfrac{PB^2}{PB.QC}=\dfrac{PB}{QC}$ Bổ đề được chứng minh. Quay trở lại bài toán : a) Ta có : $\angle AO_1B=2\angle AIB=2\left ( 180^0-\angle IAB-\angle IBA \right )=2\left ( 180^0-\dfrac{180^0-\angle BAD}{2} -\dfrac{180^0-\angle ABD}{2}\right )=\angle BAD+\angle ABD=180^0-\angle ADB\Rightarrow \angle AO_1B+\angle ADB=180^0$ Do vậy bốn điểm $A,O_1,B,D$ đồng viên. Từ đó : $\angle ADO_1=\angle ABO_1=\dfrac{180^0-\angle AO_1B}{2}=\dfrac{\angle ADB}{2}$ Tương tự được $\angle AO_2C=\dfrac{\angle ADC}{2}$ . Từ đó có : $\angle O_1DO_2=\angle ADO_1+\angle ADO_2=\frac{\angle ADB+\angle ADC}{2}=90^0$ Như vậy đường tròn đường kính $O_1O_2$ đi qua điểm $D$ . b) Ta có : $\angle O_1AJ=\angle O_1AB+\angle BAC+\angle CAJ=\frac{180^0-\angle AO_1B}{2}+60^0+(180^0-\angle ACJ-\angle AJC)=270^0-\frac{\angle AO_1B}{2}-\angle AJC=270^0-\dfrac{\angle AO_1B+\angle AO_2C}{2}=270^0-\dfrac{(180^0-\angle ADB)+(180^0-\angle ADC)}{2}=180^0$ Như vậy thì ba điểm $O_1,A,J$ thẳng hàng. Tương tự ba điểm $O_2,A,I$ thẳng hàng. Mà ta có $FO_1\perp AI,FO_2\perp AJ$ do $F$ là tâm ngoại tiếp tam giác $AIJ$ . Suy ra $A$ là trực tâm tam giác $FO_1O_2$ , kéo theo $FA\perp O_1O_2$ . Mà $AE\perp O_1O_2$ do $AE$ là trục đẳng phương của $(O_1),(O_2)$ . Ta được ba điểm $A,E,F$ thẳng hàng. Dễ dàng nhìn ra : $\angle AEI=\angle ABI=60^0=\angle ACJ=\angle AEJ$ Như vậy $A$ thuộc phân giác trong góc $E$ . Tiếp theo ta chỉ cần chứng tỏ $\angle IAJ=90^0+\dfrac{IEJ}{2}=150^0$ thì ta sẽ được $A$ là tâm nội tiếp tam giác $EIJ$ . Thực vậy, $\angle IAJ=\angle O_1AO_2=\angle O_1AB+\angle BAC+\angle O_2AC=\angle O_1DB+60^0+\angle O_2DC=60^0+90^0=150^0$ Từ đó áp dụng bổ đề ta được điều phải chứng minh : $\dfrac{AI^2}{AJ^2}=\dfrac{IP}{JQ}$

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/06/geometry-23/

---

## 74. (Chọn đội tuyển VMO 2013-2014 tỉnh Đồng Tháp)

**Đề:** Cho tam giác nhọn $ABC$ ngoại tiếp $(I)$ nội tiếp $(O)$ . Gọi $P$ là trung điểm cung $BC$ không chứa $A$ . $J$ đối xứng với $I$ qua $O$ . Tiếp tuyến tại $I$ của đường tròn $(IBC)$ cắt $BC$ tại $M$ . $H$ là hình chiếu của $M$ trên $OI$ . Gọi $D$ là trung điểm của $BC$ và $K$ là giao của $ID$ với đường tròn $(ODH)$ . a) Chứng minh : Tam giác $JPM$ vuông tại $P$ . b) Chứng minh : $H,K,A$ thẳng hàng.

<details><summary>Lời giải</summary>

a) Vẽ đường kính $POX$ của $(O)$ . Dễ thấy $XJPI$ là hình bình hành. Từ đó mà $\angle DPJ=\angle PXI$ Tam giác $XBP$ vuông tại $B$ đường cao $BD$ nên : $PB^2=PD.PX\Rightarrow PI^2=PD.PX\;\;(PI=PB)\Rightarrow \Delta PID\sim \Delta PXI\Rightarrow \angle PXI=\angle PID$ Dễ dàng thấy tứ giác $MIDP$ nội tiếp nên : $\angle PID=\angle PMD$ Từ đó ta được : $\angle PMD=\angle DPJ$ . Mà $\angle PMD+\angle DPM=90^0$ . Nên $\angle JPM=\angle DPJ+\angle DPM=90^0$ Do đó tam giác $JPM$ vuông tại $P$ . b) Gọi $Y$ là giao của $MA$ và $(O)$ . Cho $YI$ cắt $(O)$ tại $Y'$ . Ta có : $MI^2=MB.MC=MY.MA\Rightarrow \angle MYI=90^0$ Suy ra $A,O,Y'$ thẳng hàng. Bằng cách xét hai tam giác $AOJ,Y'OI$ bằng nhau ta được $\angle JAO=\angle OY'I$ , hai góc này ở vị trí so le trong nên ta được $AJ\parallel YI$ . Dẫn đến $\angle MAJ=90^0$ . Theo câu a ta được $\angle MPJ=90^0$ , từ đó bốn điểm $A,J,P,M$ đồng viên. Cũng dễ thấy $M,H,J,P$ đồng viên nên có $A,H,P,J$ đồng viên. Từ đó được $\angle AHI=\angle AHJ=\angle APJ=\angle IPJ$ . Lại có $\angle IPJ=90^0-\angle IPM=\angle IMP$ và $\angle IMP=\angle IDO=\angle KDO$ do tứ giác $IDPM$ nội tiếp. Từ đó thu được : $\angle KDO=\angle AHO$ Mà bốn điểm $K,H,D,O$ đồng viên nên $\angle KHO=\angle KDO$ . Suy ra $\angle AHO=\angle KHO$ . Điều này chứng tỏ rằng $H,K,A$ thẳng hàng.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/05/geometry-22/

---

## 75. (Luyện tập đội tuyển Olympic 30-4 lớp 11 THPT Chuyên Quang Trung, Bình Phước)

**Đề:** Cho tam giác $ABC$ có $AB>AC$ và nội tiếp $(O)$ . Phân giác ngoài của góc $A$ cắt $(O)$ tại $E$ . $M,N$ theo thứ tự là trung điểm của $BC,CA$ . $K$ là giao của $AE,MN$ và $F$ là hình chiếu của $F$ trên $AB$ . Chứng minh rằng $KF$ song song với $BC$ .

<details><summary>Lời giải</summary>

Phân giác trong góc $A$ cắt $MN$ tại $J$ và cắt $(O)$ lần nữa tại $L$ . Dễ thấy rằng $E,O,M,L$ thẳng hàng. Ta có $\angle ALC=\angle ABC$ vì cùng chắn cung $AC$ và có $\angle ABC=\angle NMC=\angle JMC$ vì $MN$ là đường trung bình của tam giác $ABC$ . Từ đó có $\angle ALC=\angle JLC=\angle JMC$ . Vậy tứ giác $JMLC$ nội tiếp. Kết hợp với $\angle LMC=90^0$ ta có $\angle LJC=90^0$ hay $CJ\perp AL$ . Hơn nữa dễ thấy $AK\perp AL$ nên có ngay $AK\parallel JC$ Ta có : $\angle AKN=\angle EAB\;\;(MK\parallel AB)=\angle EBC=\angle KAN\Rightarrow AN=NK=NC$ Dẫn đến $N$ là tâm ngoại tiếp tam giác $AKC$ nên $\angle AKC=90^0$ hay $AK\perp KC$ mà $AK\perp AJ$ nên $AJ\parallel KC$ . Từ đó lần lượt suy ra được các tứ giác $AKCJ,AFMJ,FKCM$ là các hình bình hành. Từ đó không khó để thấy : $\angle JMC=\angle AFK=\angle FKM$ Dẫn đến $FK$ song song $BC$ . Điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/05/geometry-21/

---

## 76. (Tạp chí Toán học và tuổi trẻ sồ 412)

**Đề:** Cho hai đường tròn $(C_1),(C_2)$ sao cho tâm $O$ của $(C_2)$ nằm trên $(C_1)$ . Gọi $C,D$ là hai giao điểm của $(C_1),(C_2)$ . $A$ là điểm nằm trên $(C_1)$ , $B$ là điểm nằm trên $(C_2)$ sao cho $AC$ tiếp xúc $(C_2)$ tại $C$ và $BC$ tiếp xúc $(C_1)$ tại $F$ . Đường thẳng $CE$ cắt $(C_1)$ tại $G$ , $CF$ cắt $GD$ tại $H$ . Chứng minh rằng giao điểm của $GO$ và $EH$ là tâm ngoại tiếp của tam giác $DEF$ .

<details><summary>Lời giải</summary>

Theo tính chất góc ngoài tam giác ta có : $\angle CEF=\angle ECA+\angle EAC,\angle CFE=\angle CBF+\angle FCB$ Hơn nữa theo tính chất tiếp tuyến ta được : $\angle FCB=\angle EAC,\angle ECA=\angle CFE$ Như vậy suy ra hai góc $CEF,CFE$ bằng nhau, suy ra tam giác $CFE$ cân tại $C$ . Dễ dàng nhìn ra $AO$ chính là trung trực của $CD$ nên ta được hai cung $CA,CD$ bằng nhau. Suy ra hai góc nội tiếp $CFA,CFD$ bằng nhau. Theo trên ta có $\angle CFA=\angle CFE=\angle CEF$ . Được $FD\parallel GC$ . Ta có : $\angle DEG=\angle DBC=\dfrac{1}{2}\angle DOC=\angle COI$ Hơn nữa lại có $\angle EGD=\angle CGD=\dfrac{1}{2}\angle CID=\angle CIO$ . Từ đó thấy ngay hai tam giác $CIO,EGD$ đồng dạng mà tam giác $CIO$ cân nên tam giác $EGD$ cân. Lại dễ thấy $GO$ là phân giác của tam giác $EGD$ nên nó cũng là trung trực của $ED (1)$ . Vì $FD$ song song $GC$ nên $CF=GD$ , tam giác $GED$ cân nên $GD=GE$ . Tam giác $CEF$ cân nên $CE=CF$ . Suy ra được $CE=EG$ . Vì $CFDG$ là hình thang cân nên hai góc $GCH,CGH$ bằng nhau. Tam giác $GCH$ cân có trung tuyến $HE$ nên $HE$ cũng là trung trực của $GC$ , suy ra $HE$ là trung trực của $FD (2)$ Từ $(1)(2)$ ta có điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/04/geometry-20/

---

## 77. (Kiểm tra trường Đông toán học miền Bắc 2013-2014)

**Đề:** Cho tam giác $ABC$ nội tiếp $(O)$ , hai điểm $B,C$ cố định và $BC$ không là đường kính. $A$ thay đổi sao cho tam giác $ABC$ nhọn. Đường tròn tâm $B$ qua $A$ cắt $AC$ và $(O)$ tại $D,E$ . $DE$ cắt $(O)$ tại $K$ . a) Chứng minh rằng $BK$ vuông góc $AC$ . b) Giao của $BK,AE$ tại $F$ . $M$ là giao của $AC$ và đường tròn ngoại tiếp tam giác $DEF$ . Chứng minh rằng $M$ luôn thuộc một đường thẳng cố định.

<details><summary>Lời giải</summary>

a) Ta có : $AKEB$ nội tiếp nên $\angle BAK=180^0-\angle BED$ Mà $\angle BDK=180^0-\angle BDE=180^0-\angle BED$ Như vậy ta được $\angle BAK=\angle BDK$ . Lại có thêm $\angle AKB=\angle BCE=\angle BKE$ nên hai tam giác $BAK,BDK$ đồng dạng. Từ đó mà : $\angle ABK=\angle DBK$ Suy ra $BK$ là phân giác góc $ABD$ . Tam giác $ABD$ cân tại $B$ có $BK$ phân giác nên cũng là đường cao. Chứng tỏ : $BK\perp AC$ b) Vì $F$ thuộc $BK$ và $BK$ là trung trực của $AD$ nên $FA=FD$ . Nên tam giác $AFD$ cân, kéo theo $\angle FAD=\angle ADF\Rightarrow \angle EAM=\angle ADF$ Lại có $\angle ADF=\angle MEA$ (tứ giác $FDME$ nội tiếp). Suy ra $\angle EAM=\angle MEA$ . Kéo theo tam giác $AME$ cân tại $M$ hay là $AM=ME$ . Kết hợp với $AB=BE$ ta được $BM$ là trung trực của $AE$ Mà $BO$ là trung trực $AE$ do $AE$ là trục đẳng phương của hai đường tròn. Ta suy ra $B,M,O$ thẳng hàng. Do đó $M$ luôn thuộc $BO$ cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/04/geometry-19/

---

## 78. (Chọn đội tuyển VMO 2013-2014 tỉnh Bà Rịa &#8211; Vũng Tàu)

**Đề:** Cho tam giác $ABC$ không cân nội tiếp $(O)$ . Hai tiếp tuyến của $(O)$ tại $B,C$ cắt nhau tại $I$ . $AI$ cắt $(O)$ tại $D$ khác $A$ . $M,K$ theo thứ tự là trung điểm của $BC,AD$ . Hai đường thẳng $BC,AM$ cắt $(O)$ tại $E,F$ a) Chứng minh rằng $\angle BAD=\angle MAC$ b) Chứng minh rằng $EF\parallel AB$

<details><summary>Lời giải</summary>

a) Xét hai tam giác $ABD$ và $AMC$ . Ta có : $\angle ADB=\angle ACM$ ( $A,B,C,D$ đồng viên) Theo định lí Ptolemy cho tứ giác $ABDC$ nội tiếp : $AD.BC=AB.CD+AC.BD$ Mà $AB.CD=AC.BD$ do tứ giác $ABDC$ là tứ giác điều hòa. Nên ta suy ra : $AD.BC=2AC.BD\Rightarrow AD.MC=AC.BD\;\;(BC=2MC)\Rightarrow \dfrac{AD}{BD}=\dfrac{AC}{MC}$ Vậy ta có hai tam giác $ABD,AMC$ đồng dạng. Từ đó được : $\angle BAD=\angle MAC$ b) Lấy $S$ là trung điểm của $AC$ . Nên $MS$ là đường trung bình của tam giác $ABC$ . Nên $MS\parallel AB (1)$ Ta có $\Delta ABD\sim \Delta AMC\Rightarrow \dfrac{AB}{AD}=\dfrac{AM}{AC}\Rightarrow \dfrac{AB}{AD:2}=\dfrac{AM}{AC:2}\Rightarrow \dfrac{AB}{AK}=\dfrac{AM}{AS}$ Lại có $\angle BAD=\angle MAC\Rightarrow \angle BAK=\angle MAS$ Suy ra hai tam giác $ABK,AMS$ đồng dạng. Kéo theo : $\angle ABK=\angle AMS$ Mà $\angle ABK=\angle ABE=\angle AFE$ nên $\angle AMS=\angle AFE$ . Hai góc này ở vị trí so le trong nên có ngay $MS$ song song $EF (2)$ Từ $(1)(2)$ suy ra $EF$ song song $AB$

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/04/geometry-18/

---

## 79. (IMO Shortlist 2008)

**Đề:** Cho tam giác $ABC$ nhọn trực tâm $H$ . $A_0,B_0,C_0$ là trung điểm của các cạnh $BC,CA,AB$ . Đường tròn $(A_0,A_0H)$ cắt $BC$ tại $A_1,A_2$ . Tương tự ta xác định các điểm $B_1,B_2,C_1,C_2$ . Chứng minh rằng sáu điểm $A_1,A_2,B_1,B_2,C_1,C_2$ cùng thuộc một đường tròn.

<details><summary>Lời giải</summary>

Ta có $HC$ vuông góc $A_0B_0$ do $HC\perp AB,A_0B_0\parallel AB$ . Mà $HC$ đi qua $H$ nên $HC$ là trục đẳng phương của $(A_0),(B_0)$ . Từ đó mà : $CB_2.CB_1=CA_1.CA_2$ Ta được tứ giác $A_1A_2B_1B_2$ nội tiếp. Tương tự ta được các tứ giác nội tiếp $B_1B_2C_1C_2,C_1C_2A_1A_2$ . Ba đường tròn $(A_1A_2B_1B_2),(B_1B_2C_1C_2),(C_1C_2A_1A_2)$ đôi một có các trục đẳng phương là $B_1B_2,C_1C_2,A_1A_2$ . Nếu sáu điểm nói trên không cùng thuộc một đường tròn thì $A_1A_2,B_1B_2,C_1C_2$ sẽ đồng quy mà điều này thì vô lí. Do đó ta được điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/04/geometry-17/

---

## 80. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ nội tiếp $(O)$ , gọi $P$ là điểm nằm trong tam giác thỏa mãn $AP$ là phân giác trong góc $BAC$ . Kẻ $PE,PF$ lần lượt vuông góc với $AB,AC$ . Gọi $D$ thuộc $(O)$ sao cho $AP$ vuông góc $AD$ . Kẻ $DP$ cắt $EF$ tại $Q$ . Gọi $M$ là trung điểm của $BC$ . a) Chứng minh rằng $QM$ song song với $AB$ b) Gọi $K,L$ là tâm các đường tròn $(BQF),(CEQ)$ . Chứng minh rằng $(K),(L)$ cắt nhau tại một điểm trên $(O)$ . c) Kéo dài $QM$ cắt $(K),(L)$ tại $S,T$ . Chứng minh rằng $AO$ và trung trực của $ST$ cắt nhau tại một điểm trên $(O)$ .

<details><summary>Lời giải</summary>

a) $AP$ giao $(O)$ tại $U$ . Không khó để thấy $U,M,O,D$ thẳng hàng. Gọi giao của $AP$ và $FE$ là $W$ . Ta có thể thấy rằng : $\dfrac{AW}{AP}=\dfrac{AF.cos\dfrac{A}{2}}{AF:cos\dfrac{A}{2}}=cos^2\dfrac{A}{2}$ Và : $\dfrac{DM}{DU}=\dfrac{MC.tan\angle DCM}{2R}=\dfrac{BC.tan\left ( \dfrac{\pi -A}{2} \right )}{4R}=\dfrac{sinA.cot\dfrac{A}{2}}{2}=cos^2\dfrac{A}{2}$ Do vậy mà $\dfrac{AW}{AP}=\dfrac{DM}{DU}$ . Hơn nữa do cùng vuông góc với $AP$ mà $EF$ song song $AD$ . Theo Thales : $\dfrac{AW}{AP}=\dfrac{QD}{DP}$ Từ đó có ngay $\dfrac{DM}{DU}=\dfrac{QD}{DP}$ , suy ra $QM$ song song $AP$ theo Thales đảo. b) Gọi $X$ là giao của $DP$ và $(O)$ . Ta chứng minh các tứ giác $BFQX,CEQX$ nội tiếp thì hoàn tất. Ta có $AD\parallel EF\Rightarrow \angle kAF=\angle AFE$ mà $\angle kAF=\angle DCB=\angle BXQ$ Nên ta được ngay tứ giác $BFQX$ nội tiếp vì : $\angle BXQ=\angle AFE$ Dễ thấy $D$ là trung điểm của cung $BAC$ nên $\angle BXQ=\angle CXQ$ Hơn nữa vì $BFQX$ nội tiếp nên $\angle BXQ=\angle AFE=\angle AEF$ . Kéo theo $\angle AEF=\angle QXC$ . Như vậy tứ giác $CEQX$ cũng nội tiếp. c) Kẻ đường kính $AOH$ của $(O)$ . Ta sẽ chứng minh $HU$ là trung trực của $ST$ . Do $QM\parallel AP,AP\perp EF$ nên $EF\perp QM$ . Suy ra $FS$ là đường kính của $(K)$ . Suy ra $BS\perp AB$ . Mà ta cũng có $HB\perp AB$ do $AH$ là đường kính của $(O)$ . Nên ba điểm $B,S,H$ thẳng hàng. Một cách tương tự $T,H,C$ thẳng hàng. Bây giờ, chú ý là : $\angle HST=\angle QSB=\angle QXB=\angle QXC=\angle QTC=\angle STH$ Nên tam giác $SHT$ cân tại $H$ . Hơn nữa cũng có $HU$ vuông góc $ST$ vì cùng vuông góc $AP$ . Như vậy $HU$ là trung trực của $ST$ . Ta được điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/03/geometry-16/

---

## 81. (không rõ nguồn thi)

**Đề:** Cho hai đường tròn $(C_1),(C_2)$ tiếp xúc ngoài tại $T$ . Một tiếp tuyến của $(C_2)$ tại $X$ cắt $(C_1)$ tại $A,B$ . $XT$ cắt $(C_1)$ lần nữa tại $S$ . Trên cung $ST$ không chứa $A,B$ của $(C_1)$ ta lấy điểm $C$ . Kẻ tiếp tuyến $CY$ đến $(C_2)$ với $Y$ thuộc $(C_2)$ . $SC$ cắt $XY$ tại $I$ . a) Chứng minh rằng bốn điểm $C,T,Y,I$ đồng viên. b) Chứng minh $I$ là tâm bàng tiếp của tam giác $ABC$ .

<details><summary>Lời giải</summary>

a) Kẻ tiếp tuyến chung trong $xTy$ của hai đường tròn. Gọi $G$ là giao của $TY$ với $(C_1)$ Ta có : $\angle TYX=\angle xTX=\angle yTS=\angle TGS$ Mà $\angle TGS=\angle TCI$ (tứ giác $GTCS$ nội tiếp) nên có $\angle TYI=\angle TCI$ Do vậy mà bốn điểm $C,T,Y,I$ đồng viên. b) Ta có : $\angle AXT=\angle xTX=\angle yTS=\angle yTC_1-\angle C_1TS=90^0-\angle TSC_1\Rightarrow \angle TSC_1+\angle AXT=90^0\Rightarrow C_1S\perp AB$ Qua $C$ kẻ đường thẳng vuông góc với $CI$ cắt $(C_1)$ tại $L$ thì do $\angle LCS=90^0$ nên $SL$ là đường kính của $(C_1)$ mà lại có $SL\perp AB\;\;(SC_1\perp AB)$ nên $L$ là trung điểm của cung $ALB$ . Suy ra $CL$ là phân giác trong của tam giác $ABC$ mà $CI\perp CL$ nên $CI$ là phân giác ngoài của tam giác $ABC$ . $(*)$ Gọi $J$ là giao của $BI$ với $(C_1)$ . Vì tứ giác $AJSB$ nội tiếp nên $\angle AJS=180^0-\angle ABS$ và có $\angle IJS=180^0-\angle BJS=$ . Chú ý do $SC_1\perp AB$ mà ta có hai cung $SA,SB$ bằng nhau, từ đó $\angle ABS=\angle BJS$ , kéo theo $\angle AJS=\angle IJS\;\;\;\;(1)$ Tiếp theo ta chứng minh tam giác $BSI$ cân tại $S$ . Ta có $\angle BXS=\angle xTX=\angle STy=\angle SGT=\angle SBT$ . Từ đó dễ thấy hai tam giác $BST,XSB$ đồng dạng. Suy ra $SB^2=ST.SX$ . Cũng có $\angle SXI=\angle TYC= \angle TIS$ nên hai tam giác $STI$ và $SIX$ đồng dạng. Suy ra $SI^2=ST.SX$ . Như vậy $SB=SI$ nên tam giác $SBI$ cân tại $S$ . Kéo theo : $\angle JAS=\angle JBS=\angle JIS\;\;\;(2)$ Từ $(1)(2)$ suy ra hai tam giác $JAS,JIS$ đồng dạng. Suy ra : $\angle JAS=\angle JSI=\angle JSC$ Do đó hai cung $JA,JC$ của $(C_1)$ là bằng nhau. Từ đó $BJ$ hay $BI$ là phân giác trong của tam giác $ABC$ . $(**)$ Từ $(*)(**)$ ta được $I$ là tâm bàng tiếp tam giác $ABC$

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/03/geometry-15/

---

## 82. (Vietnamese Mathematical Olympiad 2012)

**Đề:** Cho tứ giác lồi $ABCD$ nội tiếp $(O)$ và có các cặp cạnh đối không song song. Gọi $M,N$ tương ứng là giao điểm các cặp đường thẳng $AB$ và $CD$ , $AD$ và $BC$ . Gọi $P,Q,S,T$ tương ứng là giao điểm các phân giác trong của các cặp góc $(MAN,MBN),(MBN,MCN),(MCN,MDN),(MDN),(MAN)$ . Gỉa sử rằng bốn điểm $P,Q,S,T$ phân biệt. a) Chứng minh rằng bốn điểm $P,Q,S,T$ cùng thuộc một đường tròn. Gọi $I$ là tâm đường tròn này. b) Gọi $E$ là giao điểm của hai đường chéo $AC,BD$ . Chứng minh rằng $E,O,I$ thẳng hàng.

<details><summary>Lời giải</summary>

a) Trong tam giác $QBC$ : $\angle PQS=\angle BQC=180^0-\angle QBC-\angle QCB=180^0-\left ( \angle ABQ+\angle ABC \right )-\dfrac{\angle C}{2}=180^0-\left ( \dfrac{180^0-\angle B}{2}+\angle B \right )-\dfrac{\angle C}{2}=90^0-\dfrac{\angle B+\angle C}{2}$ Trong tam giác $TAD$ : $\angle PTS=\angle ATD=180^0-\angle TAD-\angle TDA=180^0-\left ( \angle MAT+\angle MAD \right )-\dfrac{\angle MDA}{2}=180^0-\left ( \dfrac{\angle MAN}{2} +\angle C\right )-\dfrac{\angle B}{2}=180^0-\left ( \dfrac{\angle A}{2}+\angle C \right )-\dfrac{\angle B}{2}$ Đẳng thức : $180^0-\left ( \dfrac{\angle A}{2}+\angle C \right )-\dfrac{\angle B}{2}=90^0-\dfrac{\angle B+\angle C}{2}\Leftrightarrow \angle A+\angle C=180^0$ Là một đẳng thức đúng. Do vậy mà $\angle PTS=\angle PQS$ , điều này chứng tỏ bốn điểm $P,Q,S,T$ đồng viên. b) Để ý rằng $P$ là tâm bàng tiếp góc $B$ tam giác $ABN$ nên $NP$ là phân giác ngoài của tam giác $ABN$ . Trong tam giác $APN$ ta có : $\angle APN=180^0-\angle PAN-\angle ANP=180^0-\dfrac{1}{2}\angle MAN-\dfrac{1}{2}(180^0-\angle ANB)=90^0-\dfrac{\angle A}{2}-\dfrac{1}{2}\angle ANB=90^0-\dfrac{\angle A}{2}-\dfrac{1}{2}(180^0-\angle D-\angle C)=\frac{\angle D+\angle C-\angle A}{2}$ Lại có : $\angle SDA=\dfrac{\angle MDA}{2}=\frac{180^0-\angle D}{2}$ Dễ dàng nhận thấy $\angle SDA=\angle APN$ nên bốn điểm $S,P,A,D$ đồng viên. Từ đó : $NP.NS=NA.ND\Rightarrow P_{N/(O)}=P_{N/(I)}$ Vậy $N$ nằm trên trục đẳng phương của hai đường tròn $(I)$ và $(O)$ . Bằng những biến đổi góc tương tự ta được bốn điểm $Q,T,C,D$ đồng viên. Suy ra : $MQ.MT=MD.MC\Rightarrow P_{M/(I)}=P_{M/(O)}$ Như vậy $MN$ là trục đẳng phương của $(I)$ và $(O)$ nên $MN\perp OI$ . Lại theo định lí Brocard ta có $O$ là trực tâm tam giác $EMN$ nên $OE\perp MN$ . Từ đó có ngay $O,E,I$ thẳng hàng.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/01/geometry-13/

---

## 83. (Đề thi thử VMO 2013-2014 trường THPT Chuyên Lương Thế Vinh, Đồng Nai)

**Đề:** Cho tam giác $ABC$ ngoại tiếp đường tròn $(I)$ .Gọi $D,E$ là tiếp điểm của đường tròn $(I)$ với $BC,AC$ .Trên tia đối tia $CB$ lấy $X$ .Biết rằng hai đường tròn nội tiếp tam giác $ABX$ và $ACX$ cắt nhau tại hai điểm $P,Q$ . Chứng minh rằng: a)Các đường thẳng $DE$ ,phân giác trong góc $ABC$ và đường trung bình tam giác $ABC$ đồng qui. b)Đường thẳng $PQ$ luôn đi qua một điểm cố định khi $X$ đi động trên tia đối tia $CB$ .

<details><summary>Lời giải</summary>

a) Gọi $M,N$ là trung điểm của $AB,AC$ . Gọi $Z$ là giao của $DE$ và $BI$ . Bài toán hoàn tất nếu ta chỉ ra được $M,Z,N$ thẳng hàng. Gọi $S$ là tiếp điểm của $(I)$ trên $AB$ . Dễ thấy rằng $CS,AD,BE$ đồng quy tại điểm Gergonne của tam giác $ABC$ nên ta có : $Z(ESAB)=-1$ Dễ dàng thấy hai tam giác $BSZ$ và $BDZ$ bằng nhau nên $\angle SZB=\angle DZB$ . Theo định lí về chùm điều hòa ta có $\angle AZB=90^0$ . Như vậy $M$ là tâm đường tròn ngoại tiếp tam giác $AZB$ . Ta được tam giác $MZB$ cân nên $\angle MZB=\angle MBZ=\angle ZBD$ , suy ra $MZ\parallel BD\equiv BC$ Mà ta đã có $MN\parallel BC$ theo tính chất đường trung bình nên ta có $M,Z,N$ thẳng hàng. Ta có điều phải chứng minh. b) Gọi $I_1,I_2$ lần lượt là tâm nội tiếp các tam giác $ABX,ACX$ . Trong tam giác $ABX$ , ta gọi tiếp điểm với $(I_1)$ của $BX,AX$ lần lượt là $J,K$ . Theo câu a ta có $BI_1,JK,MN$ đồng quy tại $T$ . Trong tam giác $ACX$ , ta gọi tiếp điểm với $(I_2)$ của $CX,AX$ lần lượt là $U,V$ . Theo câu a ta có $CI_2,UV,MN$ đồng quy tại $F$ . Gọi giao điểm của $PQ$ và $MN$ là $W$ . Ta chứng minh điểm $W$ cố định như sau. Dễ thấy ba đường thẳng $JK,PQ,UV$ song song vì cùng vuông góc với $I_1I_2$ . Hai đường tròn $(I_1),(I_2)$ có tiếp tuyến chung ngoài $UV$ và trục đẳng phương $PQ$ nên $PQ$ chia đôi $UV$ . Từ đó suy ra $PQ$ chia đôi $FT$ vì $FT\parallel UV$ . Hay nói cách khác $W$ là trung điểm của $FT$ . Mặt khác $F,T$ đều cố định nên $W$ cố định. Như vậy $PQ$ luôn đi qua một điểm cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/01/geometry-12/

---

## 84. (Chọn đội tuyển VMO tỉnh Hà Tĩnh 2013-2014)

**Đề:** Cho tam giác $ABC$ , đường cao $AA',CC'$ cắt nhau tại $H$ . Đường phân giác của góc nhọn tạo bởi hai đường thẳng $AA',CC'$ cắt $AB,BC$ tại $P,Q$ . Đường thẳng qua $P$ vuông góc $AB$ , đường thẳng qua $Q$ vuông góc $BC$ cắt nhau tại $R$ . a) Chứng minh rằng $BR$ là phân giác góc $ABC$ . b) Gọi $M$ là trung điểm của $AC$ . Chứng minh $H,R,M$ thẳng hàng.

<details><summary>Lời giải</summary>

a) Dễ dàng nhận ra rằng hai tam giác $C'PH$ và $A'QH$ đồng dạng nên : $\angle C'PH=\angle A'QH$ Suy ra tam giác $BPQ$ cân tại $B$ . Suy ra hai góc $PRB,QRB$ bằng nhau vì chắn các cung $BP,BQ$ bằng nhau trong tứ giác nội tiếp $BQRP$ . Chú ý rằng hai góc $PRB,QRB$ lần lượt phụ nhau với $PBR,QBR$ nên $\angle PBR=\angle QBR$ . Do đó $BR$ là phân giác góc $ABC$ . b) Gọi $X,Y$ lần lượt là giao điểm của $PR$ và $AA'$ , $QR$ và $CC'$ . Gọi $S$ là giao điểm của $HR$ và $XY$ . Dễ thấy $XHYR$ là hình bình hành nên từ đó $S$ là trung điểm của $XY (1)$ Bốn điểm $A,A',C,C'$ đồng viên nên : $\dfrac{HC'}{HA}=\dfrac{HA'}{HC}$ Theo tính chất phân giác ta lần lượt có : $\dfrac{PC'}{PA}=\dfrac{HC'}{HA},\dfrac{QA'}{QC}=\dfrac{HA'}{HC}$ Suy ra ngay $\dfrac{PC'}{PA}=\dfrac{QA'}{QC}$ . Lại theo định lí Thales : $\dfrac{PC'}{PA}=\dfrac{HX}{AX},\dfrac{QA'}{QC}=\dfrac{HY}{YC}$ Từ đó ta suy ra : $\dfrac{HX}{XA}=\dfrac{HY}{YC}$ Sử dụng định lí Thales đảo ta được $XY\parallel AC (2)$ Từ $(1)(2)$ ta suy ra $HS$ hay $HR$ đi qua trung điểm $M$ của $AC$ . Điều này chứng tỏ $H,R,M$ thẳng hàng.

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/01/geometry-11/

---

## 85. (Kiểm tra trường Đông toán học miền Nam 2013-2014)

**Đề:** Cho tam giác $ABC$ nhọn, đường tròn nội tiếp $(I)$ và ngoại tiếp $(O)$ . $M$ là trung điểm của đường cao $AH$ . $(I)$ tiếp xúc với $BC$ tại $D$ . Đường thẳng $MD$ cắt $BC$ ở $N$ . Đường thẳng $NR,NS$ tiếp xúc với $(O)$ tại $R,S$ . a) Gọi $J$ là tâm bàng tiếp góc $A$ của tam giác $ABC$ . Chứng minh rằng $M,D,J$ thẳng hàng. b) Chứng minh bốn điểm $P,D,R,S$ cùng thuộc một đường tròn.

<details><summary>Lời giải</summary>

a) Trong tam giác $ABH$ ta có : $AM=\dfrac{1}{2}AH=\dfrac{1}{2}.AB.sinB$ Theo định lí sin trong tam giác $ABJ$ : $\dfrac{AJ}{sin\angle ABJ}=\dfrac{BJ}{sin\angle BAJ}\Rightarrow AJ=\dfrac{BJ.sin\left ( \dfrac{\pi }{2}+\dfrac{B}{2} \right )}{sin\dfrac{A}{2}}=\dfrac{BJ.cos\dfrac{B}{2}}{sin\dfrac{A}{2}}$ Trong tam giác $BDI$ ta có : $ID=BI.sin\dfrac{B}{2}$ Trong tam giác vuông $BIJ$ và chú ý tính nội tiếp của tứ giác $BICJ$ : $IJ=\dfrac{BI}{sin\angle BJI}=\dfrac{BI}{sin\angle ICB}=\dfrac{BI}{sin\dfrac{C}{2}}$ Ta có : $\dfrac{AM}{AJ}=\dfrac{ID}{IJ}\;\;(*)\Leftrightarrow AM.IJ=AJ.ID\Leftrightarrow \dfrac{1}{2}AB.sinB.\dfrac{BI}{sin\dfrac{C}{2}}=\dfrac{BJ.cos\dfrac{B}{2}}{sin\dfrac{A}{2}}.BI.sin\dfrac{B}{2}\Leftrightarrow \dfrac{AB}{BJ}=\dfrac{sinC/2}{sinA/2}$ Điều này luôn đúng theo định lí sin trong tam giác $ABJ$ . Như vậy ta có hệ thức $(*)$ . Kết hợp với : $\angle MAJ=\angle DIJ$ Vì là hai góc đồng vị và do $AM\parallel ID$ . Kéo theo : $\Delta MAJ\sim \Delta DIJ\Rightarrow \angle IJD=\angle AJM$ Chứng tỏ $D,M,J$ thẳng hàng. Ta có điều phải chứng minh. b) Gọi $K$ là giao điểm của $IN$ và $PD$ theo giả thiết thì $IK\perp PD$ . Ta có bốn điểm $B,I,C,J$ đồng viên và $K,I,C,J$ đồng viên kéo theo bốn điểm $K,I,C,B$ đồng viên. Từ đó : $NK.NI=NB.NC$ Tam giác $NDI$ vuông tại $D$ và có đường cao $DK$ nên : $ND^2=NK.NI$ Do tính đối xứng mà ta có $ND=NP$ và theo tính chất tiếp tuyến thì $NR=NS$ . Từ đó kéo theo : $NR=NS=NP=ND$ Do vậy bốn điểm $P,D,R,S$ cùng thuộc đường tròn tâm $N$ bán kính $NR$ .

</details>

Nguồn: https://julielltv.wordpress.com/2014/06/01/geometry-10/

---

## 86. (IMO Shortlist 2008)

**Đề:** Trong tam giác nhọn $ABC$ , kẻ hai đường cao $BE,CF$ . Hai đường tròn qua $A,F$ tiếp xúc với đường thẳng $BC$ lần lượt tại $P,Q$ sao cho $B$ nằm giữa $C$ và $Q$ . Chứng minh rằng : $PE,QF$ gặp nhau tại một điểm thuộc đường tròn ngoại tiếp tam giác $AEF$ .

<details><summary>Lời giải</summary>

Gọi $S$ là giao điểm của $PE,QF$ . Ta đi chứng minh tứ giác $FASE$ nội tiếp. Ta sẽ chứng minh $\Delta HDP\sim \Delta QDA$ . Thật vậy, dễ thấy $\Delta BAD\sim \Delta HCD\Rightarrow \dfrac{AD}{CD}=\dfrac{BD}{HD}\Rightarrow AD.HD=CD.BD$ . Lại có $QD.DP=(QB+BD)(BP-BD)$ . Mà $BQ=\sqrt{BF.BA}=BP$ nên $QD.DP=BP^2-BD^2=BF.BA-BD^2=BD.BC-BD^2=BD.DC$ Từ đó ta được : $QD.DP=AD.HD$ . Từ đây ta suy ra $\Delta HDP\sim \Delta QDA$ . Kéo theo : $\angle HPD=\angle QAD=\angle QAB+\angle BAD$ Thế nhưng lại có $\angle QAB=\angle FQB$ (tính chất tiếp tuyến) Suy ra : $\angle HPD=\angle FQB+\angle BAD$ Lại thấy $BP^2=BF.BA=BH.BE\Rightarrow \Delta BPH\sim \Delta BEP\Rightarrow \angle EPB=\angle PHB$ Từ đó mà : $\angle ESF=\pi -\angle FQB-\angle EPB=\pi -\left ( \angle HPD-\angle BAD \right )-\angle PHB=\pi -\left ( \angle HPD+\angle PHB \right )+\angle BAD=\pi -\left ( \pi -\angle EBC \right )+\angle BAD=\angle EBC+\angle BAD=\left ( 90^0-\angle C \right )+\left ( 90^0-\angle B \right )=\angle A=\angle EAF$ Như vậy tứ giác $FASE$ nội tiếp, ta có điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/05/20/geometry-9/

---

## 87. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ nhọn với các đường cao $AD, BE, CF$ cắt nhau tại $H$ . Gọi $M, N$ lần lượt là giao điểm của các cặp đường thẳng $DE, CF$ và $DF, BE$ ; $O$ là tâm đường tròn ngoại tiếp tam giác $BHC$ . Chứng minh rằng hai đường thẳng $OA$ và $MN$ vuông góc với nhau.

<details><summary>Lời giải</summary>

Bổ đề : Cho tam giác $ABC$ có $E$ là tâm đường tròn Euler, $H$ là trực tâm. Gọi $O$ là tâm đường tròn ngoại tiếp tam giác $BHC$ . Khi đó ta có $A,E,O$ thẳng hàng. Chứng minh bổ đề : Gọi $(I)$ là đường tròn ngoại tiếp tam giác $ABC$ . Gọi $K$ là giao điểm của tia $AH$ với $(I)$ . Dễ dàng chứng minh được hai tam giác $BHC,BKC$ đối xứng nhau qua đường thẳng $BC$ . Do vậy đường tròn $(O)$ ngoại tiếp tam giác $BHC$ đối xứng với đường tròn $(I)$ ngoại tiếp tam gia $ABC$ qua $BC$ Suy ra $OI\perp BC\Rightarrow OI\parallel AH\;\;\left ( AH\perp BC \right )\;\;\;\;\;\;(1)$ Gọi $M$ là trung điểm của $BC$ . Kẻ đường kính $BIJ$ của $(I)$ . Dễ thấy $AHCJ$ là hình bình hành nên $AH=CJ$ . Mà $M$ là trung điểm của $BC$ và $O,I$ đối xứng nhau qua $BC$ nên $OI=2IM=CJ$ ( $IM$ là đường trung bình của tam giác $BJC$ ) Dẫn đến $OI=AH\;\;\:\;\;(2)$ Từ $(1)(2)$ suy ra $AHOI$ là hình bình hành. Vì $E$ là tâm đường tròn Euler của tam giác $ABC$ nên $E$ là trung điểm của $IH$ , suy ra $E$ là trung điểm của $AO$ . Điều này chứng tỏ $A,E,O$ thẳng hàng. Bổ đề được chứng minh Quay trở lại bài toán : Gọi $G$ là tâm đường tròn ngoại tiếp tam giác $DEF$ tức $G$ là tâm đường tròn $Euler$ của tam giác $ABC$ . Dễ thấy tứ giác $BHFD$ nội tiếp nên $P_{N/(BFHD)}=\overline{NF}.\overline{ND}=\overline{NB}.\overline{NH}$ Mà $\overline{NF}.\overline{ND}=P_{N/(G)},\overline{NB}.\overline{NH}=P_{N/(O)}$ Suy ra $P_{N/(O)}=P_{N/(G)}$ , tương tự $P_{M/(O)}=P_{M/(G)}$ Dẫn đến $MN$ là trục đẳng phương của $(O)$ và $G$ . Suy ra $MN\perp OG$ Mà $O,G,A$ thẳng hàng (theo bổ đề) nên $MN\perp OA$ . Điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2014/01/28/geometry-6/

---

## 88. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ cố định và điểm $M$ thay đổi trên cạnh $BC$ . Gọi $D,E$ lần lượt là điểm đối xứng với $M$ qua $AB,AC$ . Chứng minh rằng trung điểm $X$ của đoạn thẳng $DE$ luôn thuộc một đường thẳng cố định.

<details><summary>Lời giải</summary>

Gọi $I,J$ lần lượt là giao điểm của $DM$ với $AB$ và $EM$ với $AC$ . Dựng đường cao $AH$ của tam giác $ABC$ , gọi $B',C'$ lần lượt là các điểm đối xứng với $H$ qua $AC,AB$ . Dễ thấy $B'C'$ là đường thẳng cố định. Dễ dàng thấy rằng $XIMJ$ là hình bình hành nên $XI\parallel MJ$ mà $MJ\perp AJ$ ( $\widehat{AJM}=90^{0}$ ) Suy ra $IX\perp AJ$ , tương tự thì $JX\perp AI$ . Do đó $X$ là trực tâm của tam giác $AIJ$ . Dễ thấy rằng $H$ nằm trên đường tròn $(AIJ)$ , theo cách dựng các điểm $B',C'$ thì $B'C'$ là đường thẳng $Steiner$ của điểm $H$ đối với tam giác $AIJ$ , do đó $B'C'$ đi qua trực tâm $X$ của tam giác $AIJ$ . Vậy : Điểm $X$ luôn thuộc một đường thẳng cố định khi $M$ thay đổi.

</details>

Nguồn: https://julielltv.wordpress.com/2013/12/10/bai-toan-ung-dung-dinh-li-ve-duong-thang-steiner/

---

## 89. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ với $D,E$ lần lượt là hai điểm tùy ý trên các cạnh $AB,AC$ . Chứng minh rằng khi $D,E$ di động thì dây chung của hai đường tròn đường kính $CD,BE$ luôn đi qua một điểm cố định.

<details><summary>Lời giải</summary>

Gọi $\left \{ X,Y \right \}=\left ( CD \right )\cap \left ( BE \right )$ . Gọi $\left \{ I \right \}=\left ( BE \right )\cap AC,\;\left \{ K \right \}=\left ( CD \right )\cap AB$ . Gọi $\left \{ H \right \}=CK\cap BI$ . Dễ thấy rằng $BI,CK$ là hai đường cao của tam giác $ABC$ và $H$ là trực tâm tam giác $ABC$ . Do tứ giác $IKBC$ nội tiếp nên $\overline{HK}.\overline{HC}=\overline{HI}.\overline{HB}\Rightarrow P_{H/(CD)}=P_{H/(BE)}$ . Suy ra $H$ thuộc trục đẳng phương của hai đường tròn $(BE),(CE)$ , tức là $H\in XY$ . Kết luận : Dây chung $XY$ của hai đường tròn đường kính $BE$ , $CD$ luôn đi qua điểm $H$ cố định, là trực tâm tam giác $ABC$ .

</details>

Nguồn: https://julielltv.wordpress.com/2013/12/03/bai-toan-he-thuc-luong-trong-duong-tron-diem-co-dinh/

---

## 90. (không rõ nguồn thi)

**Đề:** Cho bốn điểm $A,B,C,D$ theo thứ tự đó nằm trên một đường thẳng. Hai đường tròn có tâm $O_1,O_2$ lần lượt thay đổi qua $A,C$ và $B,D$ giao nhau tại $M,N$ . Các tiếp tuyến chung của $(O_1),(O_2)$ tiếp xúc với $(O_1)$ tại $P_1,Q_1$ , tiếp xúc với $(O_2)$ tại $P_2,Q_2$ . Gọi $I,J,X,Y$ lần lượt là trung điểm của các đoạn $P_1P_2,Q_1Q_2,P2Q_1,P_1Q_2$ . a) Chứng minh rằng các điểm $M,N,X,Y,I,J$ cùng thuộc một đường thẳng $d$ . b) Chứng minh rằng đường thẳng $d$ luôn đi qua một điểm cố định.

<details><summary>Lời giải</summary>

Ta có $MN$ là trục đẳng phương của $(O_1)$ và $(O_2)$ . Mà $P_{I/(O_1)}=IP_1^2=IP_2^2=P_{I/(O_2)}$ , tương tự $P_{J/(O_1)}=P_{J/(O_2)}$ Do đó $I,J$ thuộc trục đẳng phương của $(O_1),(O_2)$ , tức $I,J$ thuộc đường thẳng $MN$ . Dễ dàng thấy $P_1Q_1\parallel P_2Q_2$ , do đó $\overrightarrow{P_1Q_1}=k\overrightarrow{P_2Q_2}\;\;\left ( k\neq 0 \right )$ Mặt khác thì $2\overrightarrow{XY}=\left ( \overrightarrow{XP_2}+\overrightarrow{P_2Q_2}+\overrightarrow{Q_2Y}\right )+\left ( \overrightarrow{XQ_1}+\overrightarrow{Q_1P_1}+\overrightarrow{P_1Y} \right )=\overrightarrow{P_2Q_2}-\overrightarrow{P_1Q_1}=\left ( 1-k \right )\overrightarrow{P_2Q_2}\Rightarrow \overrightarrow{XY}\parallel \overrightarrow{P_2Q_2}$ Nhưng $JY$ chính là đường trung bình của tam giác $Q_1Q_2P_2$ : $\overrightarrow{JY}\parallel \overrightarrow{P_2Q_2}$ Nên $\overrightarrow{JY}\parallel \overrightarrow{XY}\Rightarrow X,Y,J$ thẳng hàng, tương tự $X,Y,I$ thẳng hàng. Suy ra $X,Y,I,J$ cùng thuộc trục đẳng phương là đường thẳng $MN$ của $(O_1),(O_2)$ . b) Gọi $\left \{ W \right \}=d\cap AD$ . Ta chứng minh $W$ cố định. Vì $W$ thuộc $d$ là trục đẳng phương của $(O_1),(O_2)$ nên $P_{W/(O_1)}=P_{W/(O_2)}\Rightarrow \overrightarrow{WA}.\overrightarrow{WC}=\overrightarrow{WB}.\overrightarrow{WD}\Leftrightarrow \overrightarrow{WA}\left ( \overrightarrow{WA}+\overrightarrow{AC} \right )=\left ( \overrightarrow{WA}+\overrightarrow{AB} \right )\left ( \overrightarrow{WA}+\overrightarrow{AD} \right )\Leftrightarrow \overrightarrow{WA}.\overrightarrow{AC}=\overrightarrow{WA}\left ( \overrightarrow{AB}+\overrightarrow{AD} \right )+\overrightarrow{AB}.\overrightarrow{AD}\Leftrightarrow \overrightarrow{WA}\left ( \overrightarrow{AD}+\overrightarrow{BC} \right )=\overrightarrow{AB}.\overrightarrow{AD}$ Đẳng thức này chứng tỏ điểm $W$ cố định, vậy đường thẳng $d$ luôn đi qua một điểm cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2013/11/28/bai-toan-phuong-tich-truc-dang-phuong/

---

## 91. (Đề thi HSG lớp 12 tỉnh Đồng Nai 2013-2014)

**Đề:** Cho tam giác $ABC$ nội tiếp $(O)$ có $AB

<details><summary>Lời giải</summary>

Gọi $T$ là giao của $ON$ và $BC$ Dễ chứng minh được $IN=BN=\dfrac{BT}{cos\widehat{NBC}}=\dfrac{a/2}{cos\dfrac{A}{2}}=\dfrac{a}{2cos\dfrac{A}{2}}\Rightarrow \dfrac{IN}{AM}=\dfrac{a}{2cos\dfrac{A}{2}.2R}=\dfrac{a}{2cos\dfrac{A}{2}.\dfrac{a}{sinA}}=\dfrac{sinA}{2cos\dfrac{A}{2}}=sin\dfrac{A}{2}=\dfrac{ID}{IA}$ Mặt khác lại có $\widehat{DIN}=\widehat{IAM}$ (cùng bằng $\widehat{ONI}$ ) Suy ra $\Delta DIN\sim \Delta IAM\Rightarrow \widehat{IND}=\widehat{IMO}$ Ta có điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2013/11/11/bai-toan-chung-minh-hai-goc-bang-nhau/

---

## 92. (không rõ nguồn thi)

**Đề:** (IMO Shorlist 1991) Cho tam giác $ABC$ cố định và điểm $P$ nằm trong tam giác. Gọi $P',P"$ lần lượt là hình chiếu vuông góc của $P$ lên $AC,BC$ . $Q',Q"$ lần lượt là hình chiếu vuông góc của $C$ lên $AP,BP$ . Gọi $X$ là giao điểm của $P'Q"$ và $P"Q'$ . Chứng minh rằng $X$ chuyển động trên một đường cố định.

<details><summary>Lời giải</summary>

Do $\widehat{PP'C}=\widehat{PQ''C}=\widehat{PP''C}=\widehat{PQ'C}=90^{0}$ nên sáu điểm $P,C,P',Q',P,P'',Q''$ cùng thuộc một đường tròn. Xét lục giác nội tiếp $PP'Q''CQ'P''$ có $\left \{ A \right \}=PQ'\cap P'C\;\;,\left \{ B \right \}=PQ''\cap P''C\;\;,\left \{ X \right \}=P''Q'\cap P'Q''$ Theo định lí $Pascal$ , ta có $X,A,B$ thẳng hàng. Kết luận : $X$ luôn thuộc đường thẳng $AB$ cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2013/11/07/bai-toan-ung-dung-dinh-li-pascal/

---

## 93. (không rõ nguồn thi)

**Đề:** Bên ngoài tam giác cân $ABC$ , ta vẽ các tam giác vuông $ABE,ACF$ lần lượt vuông tại $B,C$ . Gọi $D$ là giao điểm của hai đường cao $BH,CK$ của các tam giác vuông $ABE,ACF$ . Chứng minh rằng $AD$ vuông góc với $EF$ .

<details><summary>Lời giải</summary>

Ta có $\overrightarrow{AD}.\overrightarrow{EF}=\overrightarrow{AD}\left ( \overrightarrow{AF}-\overrightarrow{AE} \right )=\overrightarrow{AD}.\overrightarrow{AF}-\overrightarrow{AD}.\overrightarrow{AE}$ Theo công thức hình chiếu và hệ thức lượng trong tam giác vuông, ta có : $\overrightarrow{AD}.\overrightarrow{AF}=\overrightarrow{AK}.\overrightarrow{AF}=AK.AF=AC^{2}\;\;;\;\;\overrightarrow{AD}.\overrightarrow{AE}=\overrightarrow{AH}.\overrightarrow{AE}=AH.AE=AB^{2}$ Từ đó chú ý rằng $AB=AC$ , ta có : $\overrightarrow{AD}.\overrightarrow{EF}=AC^{2}-AB^{2}=0$ Kết luận : $AD\perp EF$

</details>

Nguồn: https://julielltv.wordpress.com/2013/10/09/bai-toan-chung-minh-vuong-goc-2/

---

## 94. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ , đường tròn nội tiếp $(I)$ của tam giác theo thứ tự tiếp xúc với $AC,AB$ tại $B_1,C_1$ . Các điểm $B_2,C_2$ theo thứ tự thuộc $AC,AB$ sao cho $AB_2=CB_1$ và $AC_2=BC_1$ . Gọi $B_3,C_3$ theo thứ tự là trung điểm của $BB_2$ , $CC_2$ . Chứng minh rằng $B_3C_3$ vuông góc với $AI$ .

<details><summary>Lời giải</summary>

Ta có : $2\overrightarrow{B_{3}C_3}=\left ( \overrightarrow{B_{3}B}+\overrightarrow{BC}+\overrightarrow{CC_{3}} \right )+\left ( \overrightarrow{B_3B_2}+\overrightarrow{B_{2}C_{2}}+\overrightarrow{C_{2}C_{3}} \right )=\left ( \overrightarrow{B_3B} +\overrightarrow{B_{3}B_2}\right )+\left ( \overrightarrow{CC_3}+\overrightarrow{C_{2}C_3} \right )+\left ( \overrightarrow{BC} +\overrightarrow{B_{2}C_{2}}\right )=\overrightarrow{BC}+\overrightarrow{B_2C_2}$ Do đó với chú ý $AI\perp C_1B_1$ , ta có : $2\overrightarrow{B_3C_3}.\overrightarrow{AI}=\overrightarrow{AI}\left ( \overrightarrow{BC}+\overrightarrow{B_{2}C_{2}} \right )=\overrightarrow{AI}\left ( \overrightarrow{BC}+\overrightarrow{AC_2}-\overrightarrow{AB_2} \right )=\overrightarrow{AI}\left ( \overrightarrow{BC}+\overrightarrow{C_1B}+\overrightarrow{CB_1} \right )=\overrightarrow{AI}.\overrightarrow{C_{1}B_1}=0$ Do đó ta có $AI\perp B_3C_3$ . Đây là điều phải chứng minh.

</details>

Nguồn: https://julielltv.wordpress.com/2013/10/07/bai-toan-chung-minh-vuong-goc/

---

## 95. (không rõ nguồn thi)

**Đề:** Cho sáu điểm bất kì trong mặt phẳng sao cho không có ba điểm nào thẳng hàng. Gọi $\omega$ là một tam giác có ba đỉnh là ba điểm trong sáu điểm trên. Ba điểm còn lại là ba đỉnh của tam giác $\psi$ . Chứng minh rằng với mọi cách chọn tam giác $\omega$ , đường thẳng đi qua hai trọng tâm của hai tam giác $\omega ,\psi$ luôn đi qua một điểm cố định.

<details><summary>Lời giải</summary>

Gọi $A,B,C$ là ba đỉnh của tam giác $\omega$ , $D,E,F$ là ba đỉnh của tam giác $\psi$ . Gọi $G_{1},G_{2}$ lần lượt là trọng tâm hai tam giác $\omega ,\psi$ . Theo quy tắc trọng tâm, ta có : $\left\{\begin{matrix} \overrightarrow{G_{1}A}+\overrightarrow{G_{1}B}+\overrightarrow{G_{1}C}=\overrightarrow{0} & & \\ \overrightarrow{G_{2}D}+\overrightarrow{G_{2}E}+\overrightarrow{G_{2}F}=\overrightarrow{0}& & \end{matrix}\right. \Rightarrow \overrightarrow{G_{1}A}+\overrightarrow{G_{1}B}+\overrightarrow{G_{1}C}+\overrightarrow{G_{2}D}+\overrightarrow{G_{2}E}+\overrightarrow{G_{2}F}=\overrightarrow{0}\Rightarrow 3\overrightarrow{G_{1}G}+3\overrightarrow{G_{2}G}+(\overrightarrow{GA}+\overrightarrow{GB}+\overrightarrow{GC}+\overrightarrow{GD}+\overrightarrow{GE}+\overrightarrow{GF})=\overrightarrow{0}$ Chọn $G$ là trọng tâm của hệ sáu điểm $\left \{ A;B;C;D;E;F \right \}$ thì : $\overrightarrow{GA}+\overrightarrow{GB}+\overrightarrow{GC}+\overrightarrow{GD}+\overrightarrow{GE}+\overrightarrow{GF}=\overrightarrow{0}$ Suy ra $3\overrightarrow{G_{1}G}+3\overrightarrow{G_{2}G}=\overrightarrow{0}\Rightarrow G,G_{1},G_{2}$ thẳng hàng Hay $G_{1}G_{2}$ đi qua $G$ , dễ thấy điểm $G$ là điểm cố định Đây là điều phải chứng minh. Bài toán tương tự : Cho năm điểm trong mặt phẳng sao cho không có ba điểm nào thẳng hàng. Gọi $\kappa$ là một tam giác có ba đỉnh là ba điểm trong năm điểm đã cho. Hai điểm còn lại tạo thành đoạn thẳng $d$ . Chứng minh rằng với mọi cách chọn tam giác $\kappa$ thì đường thẳng đi qua trọng tâm tam giác $\kappa$ và trung điểm của đoạn thẳng $d$ luôn đi qua một điểm cố định.

</details>

Nguồn: https://julielltv.wordpress.com/2013/08/20/bai-toan-hinh-hoc-vecto-diem-co-dinh/

---

## 96. (không rõ nguồn thi)

**Đề:** Cho tam giác $ABC$ và $J$ là tâm đường tròn bàng tiếp trong góc $A$ . Đường tròn này tiếp xúc với $AB,AC,BC$ lần lượt tại $K,L,M$ . $LM$ cắt $BJ$ tại $F$ , $KM$ cắt $CJ$ tại $G$ . Gọi $S,T$ lần lượt là giao điểm của $AF$ , $AG$ với $BC$ . Chứng minh rằng: $M$ là trung điểm của $ST$ .

<details><summary>Lời giải</summary>

$\bullet$ Trước tiên, ta sẽ chứng minh $JG\perp AT$ bằng cách chứng minh $AGJL$ là tứ giác nội tiếp. Từ đó suy ra $G$ là trung điểm của $AT$ . Thật vậy, Ta có $\widehat{JGL}=180^{0}-\widehat{GBM}-\widehat{GMB}=180^{0}-(\widehat{B}+\widehat{GBA})-\widehat{CML}=180^{0}-(\widehat{B}+\widehat{KBJ})-\dfrac{180^{0}-\widehat{MCL}}{2}=180^{0}-(\widehat{B}+\dfrac{1}{2}\widehat{KBM})-(90^{0}-\dfrac{\widehat{MCL}}{2})=90^{0}-\left [ \widehat{B}+\dfrac{1}{2}(\widehat{A}+\widehat{C}) \right ]+\dfrac{\widehat{MCL}}{2}=90^{0}-\widehat{B}-\dfrac{1}{2}(\widehat{A}+\widehat{C})+\dfrac{1}{2}(\widehat{A}+\widehat{B})=90^{0}-\dfrac{\widehat{B}}{2}-\dfrac{\widehat{C}}{2}=\dfrac{\widehat{A}}{2}=\widehat{JAL}$ (Chú ý rằng $\widehat{MCL}=\widehat{A}+\widehat{B};\widehat{KBM}=\widehat{A}+\widehat{C}$ là do tính chất góc ngoài tam giác) Do đó tứ giác $AGJL$ nội tiếp mà $\widehat{JLA}=90^{0}\Rightarrow \widehat{JGA}=90^{0}\Rightarrow JG\perp AL$ Trong tam giác $TBA$ , $BG$ vừa là đường cao, vừa là phân giác nên $BG$ cũng là trung tuyến hay $GA=GT$ . $\bullet$ Bây giờ ta sẽ chứng minh $MT = AL$ và $MS=AK$ . Thật vậy, Xét tam giác $ATC$ với ba điểm $G,M,L$ thẳng hàng lần lượt thuộc các đường thẳng $AT,TC,AC$ . Theo định lí $Menelaus$ ta có : $\dfrac{GA}{GT}.\dfrac{MT}{MC}.\dfrac{LC}{LA}=1$ mà $GA = GT$ nên : $\dfrac{MT}{MC}.\dfrac{LC}{LA}=1\Rightarrow MT.LC=MC.LA$ Mà lại dễ thấy rằng $MC = LC$ nên $MT = LA$ Chứng minh tương tự ta được $MS=AK$ Lại có $AL=AK$ , suy ra $MT = MS$ Vậy : $M$ là trung điểm của $ST$ .

</details>

Nguồn: https://julielltv.wordpress.com/2013/08/20/bai-toan-chung-minh-trung-diem/
