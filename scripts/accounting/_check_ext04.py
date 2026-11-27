# Проверка чисел урока EXT04 (программно, не в Excel). Данные — лист «Справочник», «Платежи», «Сотрудники» практикума.
from decimal import Decimal, ROUND_HALF_UP
def r2(x): return float(Decimal(str(x)).quantize(Decimal('0.01'),ROUND_HALF_UP))
SP={'A01':('Альфа','Север'),'B02':('Бета','Юг'),'C03':('Гамма','Север')}
codes=['B02','A01','X99','C03']
pay=[('P01','Альфа','Поставщик',12000,'Оплачено'),('P02','Бета','Аренда',8000,'Оплачено'),('P03','Альфа','Аренда',4000,'Не оплачено'),('P04','Гамма','Поставщик',9000,'Оплачено'),('P05','Бета','Поставщик',6000,'Не оплачено'),('P06','Альфа','Поставщик',2000,'Оплачено')]
emp=[('E01','Альфа',0.25,'ОСН'),('E01','Бета',1,'СОВ'),('E02','Альфа',0.25,'СОВ'),('E02','Бета',0.5,'ОСН'),('E03','Альфа',0.5,'ДЕКРЕТ'),('E04','Гамма',1,'ОСН'),('E05','Гамма',0.5,None),('E05','Бета',0.5,None),('E06','Альфа',0.25,'СОВ'),('E07','Гамма',0.5,'ОСН')]
def vlook(k,col): return SP[k][col-2] if k in SP else '#Н/Д'
# L1
print('L1',[vlook(c,2) for c in codes],[vlook(c,3) for c in codes])
sp2=dict(SP);sp2['B02']=('Бета','Запад');print('L1 trainer',[sp2[c][1] if c in sp2 else 'Не найден' for c in codes])
# approx for X99: largest key <= X99
ks=sorted(SP);print('approx X99',SP[[k for k in ks if k<='X99'][-1]][0])
print('P04 amount',[x for x in pay if x[0]=='P04'][0][3])
# L2
print('L2 pos E04',[e[0] for e in emp].index('E04')+1,'E03 rate',emp[[e[0] for e in emp].index('E03')][2])
pos=[i for i,e in enumerate(emp) if e[0]=='E02' and e[1]=='Бета'][0]+1;print('twokey',pos,emp[pos-1][2],emp[pos-1][3])
print('unsorted match X99 type1:',sorted(SP)[-1])
e2=list(emp);e2[3]=('E02','Бета',0.5,'ДЕКРЕТ')
def two(l,i,o): 
    for e in l:
        if e[0]==i and e[1]==o: return e[3] if e[3] else 0
print('L2 trainer',two(e2,'E01','Бета'),two(e2,'E02','Бета'),two(e2,'E02','Альфа'),two(e2,'E05','Бета'))
# L3
D=[x[3] for x in pay];print('L3 D5',D[3],'sum D2:D4',sum(D[:3]));D3=list(D);D3[2]=5000;print('trainer',D3[2],D3[3],sum(D3[:3]))
# L4
print('L4 sum',sum(D),'Альфа',sum(x[3] for x in pay if x[1]=='Альфа'),'uniq',len({x[1] for x in pay}))
print('NDS',[r2(d*22/122) for d in D], 'sum',r2(sum(r2(d*22/122) for d in D)))
D4=list(D);D4[0]=10000;print('trainer',sum(D4),sum(x for x,p in zip(D4,pay) if p[1]=='Альфа'))
print('arrconst',sum([1,2,3]),sum(a*b for a,b in zip([1,2,3],[10,20,30])))
# L5
unp=[x for x in pay if x[4]=='Не оплачено'];print('L5',[u[0] for u in unp],sum(u[3] for u in unp))
print('sort',sorted(D,reverse=True),[p[0] for p in sorted(pay,key=lambda p:-p[3])])
p2=[list(x) for x in pay];p2[1][4]='Не оплачено';u2=[(x[0],x[3]) for x in p2 if x[4]=='Не оплачено'];print('trainer',u2,sum(a for _,a in u2))
# L6
print('L6',sum(range(1,5)),[5+5*i for i in range(3)],sum([5,10,15]),'last2',sum(D[-2:]),'top3',sum(sorted(D,reverse=True)[:3]))
D6=list(D);D6[5]=3000;print('trainer last2',sum(D6[-2:]),'first2',sum(D6[:2]),'drop4',sum(D6[4:]),'vstack',sum(D6[:2]+D6[4:]))
# L7
tot=sum(D);print('L7 share',tot,D[0]/tot*100,round(D[0]/tot*100,1),'nds 6000',r2(6000*22/122),'a+b',D[0]+D[1])
D7=list(D);D7[0]=15000;t7=sum(D7);print('trainer',t7,round(D7[0]/t7*100+1e-9,1),D7[0]/t7*100,r2(15000*22/122))
# L8
by={};
for x in pay: by[x[1]]=by.get(x[1],0)+x[3]
print('L8',by,len(pay));p3=[list(x) for x in pay];p3[4][3]=7000;by3={}
for x in p3: by3[x[1]]=by3.get(x[1],0)+x[3]
print('trainer',by3,sum(by3.values()))
# L9
paid={}
for x in pay:
    if x[4]=='Оплачено': paid[x[1]]=paid.get(x[1],0)+x[3]
print('L9',paid);p4=[list(x) for x in pay];p4[5][4]='Не оплачено';pd={}
for x in p4:
    if x[4]=='Оплачено': pd[x[1]]=pd.get(x[1],0)+x[3]
print('trainer',pd)
